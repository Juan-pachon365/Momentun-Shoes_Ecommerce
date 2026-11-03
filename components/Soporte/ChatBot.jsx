import { useEffect, useRef, useState } from "react";
import { buscarRespuesta, enlaceWhatsapp, primerNombre } from "@/lib/soporte";
import { useSoporte } from "@/hooks/useSoporte";
import { IconChat, IconClose, IconSend, IconWhatsapp } from "@/components/Icons";
import styles from "./Soporte.module.scss";

let nextId = 1;
const msg = (de, texto, extra = {}) => ({ id: nextId++, de, texto, ...extra });

/** Chat flotante de preguntas frecuentes. Las respuestas salen de lib/soporte.js */
export function ChatBot() {
  const datos = useSoporte();
  const preguntas = datos?.preguntas || [];
  const contactos = datos?.contactos || [];
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([]);

  // Mensaje de bienvenida, cuando ya se cargó desde el panel
  useEffect(() => {
    if (datos && mensajes.length === 0) setMensajes([msg("bot", datos.mensajes.welcome)]);
  }, [datos, mensajes.length]);
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const listaRef = useRef(null);
  const inputRef = useRef(null);
  const chipsRef = useRef(null);

  useEffect(() => {
    const el = listaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    // Las sugerencias vuelven al inicio cuando cambia la lista
    if (chipsRef.current) chipsRef.current.scrollLeft = 0;
  }, [mensajes, escribiendo, abierto]);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  const responder = (pregunta, encontrada) => {
    setMensajes((m) => [...m, msg("yo", pregunta)]);
    setEscribiendo(true);
    setTimeout(() => {
      setEscribiendo(false);
      setMensajes((m) => [
        ...m,
        encontrada
          ? msg("bot", encontrada.answer)
          : msg("bot", datos.mensajes.fallback, { contacto: true, consulta: pregunta }),
      ]);
    }, 650);
  };

  const enviar = (e) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t || escribiendo || !datos) return;
    setTexto("");
    responder(t, buscarRespuesta(t, preguntas));
  };

  const preguntados = new Set(mensajes.filter((m) => m.de === "yo").map((m) => m.texto));
  const sugerencias = preguntas.filter((p) => !preguntados.has(p.question));

  return (
    <div className={styles.chatRoot}>
      {abierto && (
        <section className={styles.panel} role="dialog" aria-label="Chat de ayuda">
          <header className={styles.panelHead}>
            <span className={styles.botAvatar}>
              <IconChat width={18} height={18} />
            </span>
            <div>
              <strong>Ayuda Momentum</strong>
              <span>Respuestas al instante</span>
            </div>
            <button type="button" className={styles.iconBtn} onClick={() => setAbierto(false)} aria-label="Cerrar chat">
              <IconClose width={20} height={20} />
            </button>
          </header>

          <div className={styles.lista} ref={listaRef} aria-live="polite">
            {mensajes.map((m) => (
              <div key={m.id} className={m.de === "yo" ? styles.burbujaYo : styles.burbujaBot}>
                <p>{m.texto}</p>
                {m.contacto && <ContactoRapido consulta={m.consulta} contactos={contactos} />}
              </div>
            ))}
            {escribiendo && (
              <div className={`${styles.burbujaBot} ${styles.escribiendo}`} aria-label="Escribiendo">
                <i />
                <i />
                <i />
              </div>
            )}
          </div>

          {sugerencias.length > 0 && (
            <div className={styles.chips} ref={chipsRef}>
              {sugerencias.map((p) => (
                <button key={p.id} type="button" onClick={() => responder(p.question, p)} disabled={escribiendo}>
                  {p.question}
                </button>
              ))}
            </div>
          )}

          <form className={styles.entrada} onSubmit={enviar}>
            <input
              ref={inputRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe tu pregunta…"
              aria-label="Escribe tu pregunta"
              maxLength={300}
            />
            <button type="submit" aria-label="Enviar" disabled={!texto.trim() || escribiendo}>
              <IconSend width={18} height={18} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className={`${styles.fab} ${abierto ? styles.fabOpen : ""}`}
        onClick={() => {
          setAbierto((v) => !v);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        aria-label={abierto ? "Cerrar chat de ayuda" : "Abrir chat de ayuda"}
        aria-expanded={abierto}
      >
        {abierto ? <IconClose /> : <IconChat />}
        {!abierto && <span className={styles.fabLabel}>¿Dudas?</span>}
      </button>
    </div>
  );
}

function ContactoRapido({ consulta, contactos }) {
  const conWhatsapp = contactos.filter((c) => c.whatsapp);
  const conCorreo = contactos.filter((c) => !c.whatsapp && c.email);
  if (!conWhatsapp.length && !conCorreo.length) return null;
  return (
    <div className={styles.contactosRapidos}>
      {conWhatsapp.map((c) => (
        <a
          key={c.id}
          className={styles.waLink}
          href={enlaceWhatsapp(c.whatsapp, `Hola ${primerNombre(c.name)}, tengo una pregunta: ${consulta}`)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconWhatsapp width={16} height={16} /> Hablar con {primerNombre(c.name)}
        </a>
      ))}
      {conCorreo.map((c) => (
        <a key={c.id} className={styles.waLink} href={`mailto:${c.email}`}>
          Escribir a {primerNombre(c.name)}
        </a>
      ))}
    </div>
  );
}
