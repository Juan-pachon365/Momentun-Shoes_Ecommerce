import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { telefonoLegible } from "@/lib/soporte";
import { useToast } from "@/contexts/ToastContext";
import styles from "./Soporte.module.scss";

const CONTACTO_VACIO = { name: "", role: "Asesor de ventas", whatsapp: "", email: "", instagram: "", schedule: "", active: true };
const PREGUNTA_VACIA = { question: "", answer: "", keywords: "", active: true };

export function SoporteTab() {
  const { notify } = useToast();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    apiFetch("/api/admin/soporte")
      .then(setDatos)
      .catch((e) => setError(e.message));
  }, []);

  // Ejecuta una acción contra la API y refresca todo con la respuesta
  const ejecutar = async (peticion, exito) => {
    setOcupado(true);
    try {
      setDatos(await peticion());
      if (exito) notify(exito, "success");
      return true;
    } catch (e) {
      notify(e.message, "danger");
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const guardar = (tipo, d, exito) => ejecutar(() => apiFetch("/api/admin/soporte", { method: "POST", body: { tipo, datos: d } }), exito);
  const eliminar = (tipo, id) => ejecutar(() => apiFetch(`/api/admin/soporte?tipo=${tipo}&id=${id}`, { method: "DELETE" }), "Eliminado");
  const mover = (tipo, lista, i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= lista.length) return;
    const ids = lista.map((x) => x.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    ejecutar(() => apiFetch("/api/admin/soporte", { method: "PUT", body: { tipo, orden: ids } }));
  };

  if (error) return <div className="form-error">{error}</div>;
  if (!datos) return <div className="spinner" />;

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        Lo que cambies aquí se ve de inmediato en la tienda: en el desplegable <b>¿Tienes dudas con tu pedido?</b> del carrito y
        en el <b>chat de ayuda</b>. Lo que esté desactivado queda guardado pero no se muestra.
      </p>

      <Lista
        titulo="Asesores de contacto"
        descripcion="Aparecen en el carrito y como botones de WhatsApp cuando el chat no sabe una respuesta."
        tipo="contacto"
        items={datos.contactos}
        vacio={CONTACTO_VACIO}
        textoAgregar="Agregar asesor"
        ocupado={ocupado}
        guardar={guardar}
        eliminar={eliminar}
        mover={mover}
        Resumen={ResumenContacto}
        Formulario={FormContacto}
        aForm={(c) => ({ ...c })}
      />

      <Lista
        titulo="Preguntas del chat"
        descripcion="Se muestran como botones en el chat. Las palabras clave ayudan a reconocer la pregunta cuando el cliente la escribe a su manera."
        tipo="pregunta"
        items={datos.preguntas}
        vacio={PREGUNTA_VACIA}
        textoAgregar="Agregar pregunta"
        ocupado={ocupado}
        guardar={guardar}
        eliminar={eliminar}
        mover={mover}
        Resumen={ResumenPregunta}
        Formulario={FormPregunta}
        aForm={(p) => ({ ...p, keywords: (p.keywords || []).join(", ") })}
      />

      <Mensajes inicial={datos.mensajes} ocupado={ocupado} guardar={guardar} />
    </div>
  );
}

/* ───────── Lista genérica con agregar / editar / ordenar / activar / eliminar ───────── */
function Lista({ titulo, descripcion, tipo, items, vacio, textoAgregar, ocupado, guardar, eliminar, mover, Resumen, Formulario, aForm }) {
  const [editando, setEditando] = useState(null); // id, "nuevo" o null
  const [form, setForm] = useState(vacio);
  const [borrar, setBorrar] = useState(null);

  const abrir = (item) => {
    setBorrar(null);
    setEditando(item ? item.id : "nuevo");
    setForm(item ? aForm(item) : vacio);
  };

  const enviar = async (e) => {
    e.preventDefault();
    const ok = await guardar(tipo, form, editando === "nuevo" ? "Agregado" : "Cambios guardados");
    if (ok) setEditando(null);
  };

  const formulario = (
    <form className={styles.editor} onSubmit={enviar}>
      <Formulario form={form} setForm={setForm} />
      <div className={styles.editorActions}>
        <button className="btn btn-primary" disabled={ocupado}>
          {ocupado ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setEditando(null)} disabled={ocupado}>
          Cancelar
        </button>
      </div>
    </form>
  );

  return (
    <section className={styles.panel}>
      <header className={styles.head}>
        <div>
          <h2>{titulo}</h2>
          <p>{descripcion}</p>
        </div>
        {editando !== "nuevo" && (
          <button className="btn btn-primary" onClick={() => abrir(null)} disabled={ocupado}>
            + {textoAgregar}
          </button>
        )}
      </header>

      {editando === "nuevo" && formulario}

      {items.length === 0 && editando !== "nuevo" && <p className={styles.empty}>Todavía no hay nada aquí.</p>}

      <ol className={styles.items}>
        {items.map((it, i) =>
          editando === it.id ? (
            <li key={it.id} className={styles.itemEditing}>
              {formulario}
            </li>
          ) : (
            <li key={it.id} className={`${styles.item} ${it.active ? "" : styles.inactive}`}>
              <div className={styles.order}>
                <button onClick={() => mover(tipo, items, i, -1)} disabled={ocupado || i === 0} aria-label="Subir">
                  ▲
                </button>
                <button onClick={() => mover(tipo, items, i, 1)} disabled={ocupado || i === items.length - 1} aria-label="Bajar">
                  ▼
                </button>
              </div>

              <div className={styles.itemBody}>
                <Resumen item={it} />
              </div>

              <div className={styles.itemActions}>
                <label className={styles.switch} title={it.active ? "Visible en la tienda" : "Oculto"}>
                  <input
                    type="checkbox"
                    checked={it.active}
                    disabled={ocupado}
                    onChange={() => guardar(tipo, { ...aForm(it), active: !it.active }, it.active ? "Ocultado" : "Visible en la tienda")}
                  />
                  <span />
                  <em>{it.active ? "Visible" : "Oculto"}</em>
                </label>
                {borrar === it.id ? (
                  <span className={styles.confirm}>
                    ¿Eliminar?
                    <button className={styles.danger} onClick={() => eliminar(tipo, it.id)} disabled={ocupado}>
                      Sí
                    </button>
                    <button onClick={() => setBorrar(null)}>No</button>
                  </span>
                ) : (
                  <>
                    <button className={styles.link} onClick={() => abrir(it)} disabled={ocupado}>
                      Editar
                    </button>
                    <button className={`${styles.link} ${styles.danger}`} onClick={() => setBorrar(it.id)} disabled={ocupado}>
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </li>
          )
        )}
      </ol>
    </section>
  );
}

/* ───────── Asesores ───────── */
function ResumenContacto({ item: c }) {
  return (
    <>
      <strong>{c.name}</strong>
      {c.role && <span className={styles.sub}>{c.role}</span>}
      <div className={styles.tags}>
        {c.whatsapp ? <span>WhatsApp {telefonoLegible(c.whatsapp)}</span> : <span className={styles.tagWarn}>Sin WhatsApp</span>}
        {c.email && <span>{c.email}</span>}
        {c.instagram && <span>@{c.instagram}</span>}
        {c.schedule && <span>{c.schedule}</span>}
      </div>
    </>
  );
}

function FormContacto({ form, setForm }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className={styles.grid2}>
      <div className="field">
        <label htmlFor="c-name">Nombre *</label>
        <input id="c-name" required maxLength={80} value={form.name} onChange={set("name")} placeholder="Ej: Daniel Díaz" />
      </div>
      <div className="field">
        <label htmlFor="c-role">Cargo</label>
        <input id="c-role" maxLength={80} value={form.role} onChange={set("role")} placeholder="Ej: Asesor de ventas" />
      </div>
      <div className="field">
        <label htmlFor="c-wa">WhatsApp</label>
        <input id="c-wa" inputMode="tel" value={form.whatsapp} onChange={set("whatsapp")} placeholder="Ej: 300 123 4567" />
        <small className={styles.hint}>Si es un celular de Colombia, el 57 se agrega solo.</small>
      </div>
      <div className="field">
        <label htmlFor="c-mail">Correo</label>
        <input id="c-mail" type="email" maxLength={120} value={form.email} onChange={set("email")} placeholder="Opcional" />
      </div>
      <div className="field">
        <label htmlFor="c-ig">Instagram</label>
        <input id="c-ig" maxLength={31} value={form.instagram} onChange={set("instagram")} placeholder="Opcional, sin @" />
      </div>
      <div className="field">
        <label htmlFor="c-hor">Horario</label>
        <input id="c-hor" maxLength={120} value={form.schedule} onChange={set("schedule")} placeholder="Ej: Lunes a sábado, 8 a. m. – 6 p. m." />
      </div>
    </div>
  );
}

/* ───────── Preguntas ───────── */
function ResumenPregunta({ item: p }) {
  return (
    <>
      <strong>{p.question}</strong>
      <span className={styles.answer}>{p.answer}</span>
      {p.keywords?.length > 0 && (
        <div className={styles.tags}>
          {p.keywords.slice(0, 8).map((k) => (
            <span key={k}>{k}</span>
          ))}
          {p.keywords.length > 8 && <span>+{p.keywords.length - 8}</span>}
        </div>
      )}
    </>
  );
}

function FormPregunta({ form, setForm }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <>
      <div className="field">
        <label htmlFor="p-q">Pregunta *</label>
        <input id="p-q" required maxLength={200} value={form.question} onChange={set("question")} placeholder="Ej: ¿Hacen envíos a todo el país?" />
      </div>
      <div className="field">
        <label htmlFor="p-a">Respuesta *</label>
        <textarea id="p-a" required maxLength={1000} rows={4} className={styles.textarea} value={form.answer} onChange={set("answer")} />
        <small className={styles.hint}>{form.answer.length}/1000</small>
      </div>
      <div className="field">
        <label htmlFor="p-k">Palabras clave</label>
        <input id="p-k" value={form.keywords} onChange={set("keywords")} placeholder="Ej: envio, domicilio, ciudades, medellin" />
        <small className={styles.hint}>Sepáralas con comas. No importan tildes ni mayúsculas.</small>
      </div>
    </>
  );
}

/* ───────── Mensajes del chat ───────── */
function Mensajes({ inicial, ocupado, guardar }) {
  const [form, setForm] = useState(inicial);
  const cambiado = form.welcome !== inicial.welcome || form.fallback !== inicial.fallback;
  useEffect(() => setForm(inicial), [inicial]);

  return (
    <section className={styles.panel}>
      <header className={styles.head}>
        <div>
          <h2>Mensajes del chat</h2>
          <p>El saludo al abrir el chat y lo que responde cuando no encuentra una pregunta.</p>
        </div>
      </header>
      <form
        className={styles.editorPlain}
        onSubmit={(e) => {
          e.preventDefault();
          guardar("mensajes", form, "Mensajes guardados");
        }}
      >
        <div className="field">
          <label htmlFor="m-w">Mensaje de bienvenida</label>
          <textarea id="m-w" required maxLength={500} rows={3} className={styles.textarea} value={form.welcome} onChange={(e) => setForm({ ...form, welcome: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="m-f">Cuando no sabe la respuesta</label>
          <textarea id="m-f" required maxLength={500} rows={3} className={styles.textarea} value={form.fallback} onChange={(e) => setForm({ ...form, fallback: e.target.value })} />
          <small className={styles.hint}>Debajo de este mensaje aparecen los botones de WhatsApp de los asesores.</small>
        </div>
        <div className={styles.editorActions}>
          <button className="btn btn-primary" disabled={ocupado || !cambiado}>
            Guardar mensajes
          </button>
        </div>
      </form>
    </section>
  );
}
