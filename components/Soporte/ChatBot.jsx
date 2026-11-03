import { useEffect, useRef, useState } from "react";
import { BIENVENIDA, CONTACTO, PREGUNTAS, SIN_RESPUESTA, buscarRespuesta, enlaceWhatsapp } from "@/lib/soporte";
import { IconChat, IconClose, IconSend, IconWhatsapp } from "@/components/Icons";
import styles from "./Soporte.module.scss";

let nextId = 1;
const msg = (de, texto, extra = {}) => ({ id: nextId++, de, texto, ...extra });

/** Chat flotante de preguntas frecuentes. Las respuestas salen de lib/soporte.js */
export function ChatBot() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState(() => [msg("bot", BIENVENIDA)]);
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
          ? msg("bot", encontrada.respuesta)
          : msg("bot", SIN_RESPUESTA, { contacto: true, consulta: pregunta }),
      ]);
    }, 650);
  };

  const enviar = (e) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t || escribiendo) return;
    setTexto("");
    responder(t, buscarRespuesta(t));
  };

  const preguntados = new Set(mensajes.filter((m) => m.de === "yo").map((m) => m.texto));
  const sugerencias = PREGUNTAS.filter((p) => !preguntados.has(p.pregunta));

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
                {m.contacto && <ContactoRapido consulta={m.consulta} />}
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
                <button key={p.pregunta} type="button" onClick={() => responder(p.pregunta, p)} disabled={escribiendo}>
                  {p.pregunta}
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

function ContactoRapido({ consulta }) {
  const wa = enlaceWhatsapp(`Hola, tengo una pregunta: ${consulta}`);
  if (wa) {
    return (
      <a className={styles.waLink} href={wa} target="_blank" rel="noopener noreferrer">
        <IconWhatsapp width={16} height={16} /> Hablar con {CONTACTO.asesor.split(" ")[0]}
      </a>
    );
  }
  if (CONTACTO.correo) {
    return (
      <a className={styles.waLink} href={`mailto:${CONTACTO.correo}`}>
        Escribir a {CONTACTO.correo}
      </a>
    );
  }
  return null;
}
