// Utilidades del chat de ayuda y de los contactos de asesoría.
// Los datos reales (contactos, preguntas y mensajes) se administran desde
// el panel de administrador → "Chat y contacto", y se guardan en Supabase.
import { supabase } from "./supabase";

// Se usan solo si Supabase no responde, para que el chat nunca quede vacío.
export const MENSAJES_RESPALDO = {
  welcome: "¡Hola! Soy el asistente de Momentum Shoes 👟 Elige una pregunta o escríbeme tu duda.",
  fallback: "No tengo una respuesta para eso todavía. Un asesor puede ayudarte directamente:",
};

let cache = null;

/** Carga contactos activos, preguntas activas y mensajes del chat (una sola vez por visita). */
export function cargarSoporte({ forzar = false } = {}) {
  if (cache && !forzar) return cache;
  cache = Promise.all([
    supabase
      .from("support_contacts")
      .select("id, name, role, whatsapp, email, instagram, schedule")
      .order("position")
      .order("id"),
    supabase.from("support_faqs").select("id, question, answer, keywords").order("position").order("id"),
    supabase.from("support_settings").select("welcome, fallback").eq("id", 1).maybeSingle(),
  ])
    .then(([c, f, s]) => ({
      contactos: c.data || [],
      preguntas: f.data || [],
      mensajes: { ...MENSAJES_RESPALDO, ...(s.data || {}) },
    }))
    .catch(() => {
      cache = null; // se reintenta en la próxima carga
      return { contactos: [], preguntas: [], mensajes: MENSAJES_RESPALDO };
    });
  return cache;
}

export const normalizar = (t) =>
  String(t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Devuelve la pregunta que mejor coincide con lo que escribió el cliente, o null. */
export function buscarRespuesta(texto, preguntas) {
  const t = ` ${normalizar(texto)} `;
  let mejor = null;
  let puntos = 0;
  for (const p of preguntas) {
    // Palabras clave: cuentan más mientras más largas sean
    let score = (p.keywords || []).reduce((acc, c) => {
      const k = normalizar(c);
      return acc + (k && t.includes(` ${k}`) ? k.length : 0);
    }, 0);
    // Las palabras largas de la propia pregunta también ayudan un poco
    for (const w of normalizar(p.question).split(" ")) if (w.length >= 5 && t.includes(` ${w}`)) score += 2;
    if (score > puntos) {
      puntos = score;
      mejor = p;
    }
  }
  return mejor;
}

export function enlaceWhatsapp(numero, mensaje = "") {
  if (!numero) return "";
  return `https://wa.me/${numero}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ""}`;
}

export function telefonoLegible(numero = "") {
  const n = numero.replace(/^57/, "");
  return numero.startsWith("57") && n.length === 10 ? `+57 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` : `+${numero}`;
}

export const primerNombre = (nombre = "") => nombre.trim().split(/\s+/)[0] || "";

export const iniciales = (nombre = "") =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
