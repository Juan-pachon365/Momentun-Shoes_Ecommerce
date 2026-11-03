import { requireAdmin } from "@/lib/adminAuth";

// Administra los contactos de asesoría, las preguntas del chat y sus mensajes.
// GET    → todo (incluye lo desactivado)
// POST   { tipo: "contacto" | "pregunta", datos }   → crea o actualiza (si datos.id existe)
// POST   { tipo: "mensajes", datos: { welcome, fallback } }
// PUT    { tipo: "contacto" | "pregunta", orden: [id, id, ...] } → reordena
// DELETE ?tipo=contacto|pregunta&id=123

const TABLAS = { contacto: "support_contacts", pregunta: "support_faqs" };
const texto = (v, max) => String(v ?? "").trim().slice(0, max);

function validarContacto(d) {
  const errores = [];
  const name = texto(d.name, 80);
  if (!name) errores.push("Escribe el nombre del asesor");
  let whatsapp = String(d.whatsapp ?? "").replace(/\D/g, "");
  if (whatsapp.length === 10 && whatsapp.startsWith("3")) whatsapp = `57${whatsapp}`; // celular colombiano sin indicativo
  if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 15)) errores.push("El WhatsApp debe tener entre 10 y 15 números");
  const email = texto(d.email, 120).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.push("El correo no es válido");
  const instagram = texto(d.instagram, 31).replace(/^@/, "");
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) errores.push("El usuario de Instagram no es válido");
  if (!whatsapp && !email && !instagram) errores.push("Agrega al menos un medio de contacto (WhatsApp, correo o Instagram)");
  return {
    errores,
    fila: {
      name,
      role: texto(d.role, 80),
      whatsapp,
      email,
      instagram,
      schedule: texto(d.schedule, 120),
      active: d.active !== false,
    },
  };
}

function validarPregunta(d) {
  const errores = [];
  const question = texto(d.question, 200);
  const answer = texto(d.answer, 1000);
  if (question.length < 3) errores.push("Escribe la pregunta");
  if (!answer) errores.push("Escribe la respuesta");
  const lista = Array.isArray(d.keywords) ? d.keywords : String(d.keywords ?? "").split(",");
  const keywords = [...new Set(lista.map((k) => texto(k, 40).toLowerCase()).filter(Boolean))].slice(0, 30);
  return { errores, fila: { question, answer, keywords, active: d.active !== false } };
}

async function todo(admin) {
  const [c, f, s] = await Promise.all([
    admin.from("support_contacts").select("*").order("position").order("id"),
    admin.from("support_faqs").select("*").order("position").order("id"),
    admin.from("support_settings").select("welcome, fallback").eq("id", 1).maybeSingle(),
  ]);
  for (const r of [c, f, s]) if (r.error) throw r.error;
  return { contactos: c.data, preguntas: f.data, mensajes: s.data || { welcome: "", fallback: "" } };
}

export default async function handler(req, res) {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { admin } = ctx;

  try {
    if (req.method === "GET") return res.json(await todo(admin));

    if (req.method === "POST") {
      const { tipo, datos = {} } = req.body || {};

      if (tipo === "mensajes") {
        const welcome = texto(datos.welcome, 500);
        const fallback = texto(datos.fallback, 500);
        if (!welcome || !fallback) return res.status(400).json({ error: "Los dos mensajes son obligatorios" });
        const { error } = await admin
          .from("support_settings")
          .upsert({ id: 1, welcome, fallback, updated_at: new Date().toISOString() });
        if (error) throw error;
        return res.json(await todo(admin));
      }

      const tabla = TABLAS[tipo];
      if (!tabla) return res.status(400).json({ error: "Tipo no válido" });
      const { errores, fila } = tipo === "contacto" ? validarContacto(datos) : validarPregunta(datos);
      if (errores.length) return res.status(400).json({ error: errores.join(". ") });

      if (datos.id) {
        const { error } = await admin.from(tabla).update(fila).eq("id", datos.id);
        if (error) throw error;
      } else {
        // Los nuevos quedan al final de la lista
        const { data: ultimo } = await admin.from(tabla).select("position").order("position", { ascending: false }).limit(1);
        const { error } = await admin.from(tabla).insert({ ...fila, position: (ultimo?.[0]?.position ?? 0) + 1 });
        if (error) throw error;
      }
      return res.json(await todo(admin));
    }

    if (req.method === "PUT") {
      const { tipo, orden } = req.body || {};
      const tabla = TABLAS[tipo];
      if (!tabla || !Array.isArray(orden)) return res.status(400).json({ error: "Datos no válidos" });
      const resultados = await Promise.all(
        orden.map((id, i) => admin.from(tabla).update({ position: i + 1 }).eq("id", id))
      );
      const fallo = resultados.find((r) => r.error);
      if (fallo) throw fallo.error;
      return res.json(await todo(admin));
    }

    if (req.method === "DELETE") {
      const tabla = TABLAS[req.query.tipo];
      const id = Number(req.query.id);
      if (!tabla || !Number.isInteger(id)) return res.status(400).json({ error: "Datos no válidos" });
      const { error } = await admin.from(tabla).delete().eq("id", id);
      if (error) throw error;
      return res.json(await todo(admin));
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (e) {
    console.error("admin/soporte", e);
    return res.status(500).json({ error: "No se pudo guardar. Intenta de nuevo." });
  }
}
