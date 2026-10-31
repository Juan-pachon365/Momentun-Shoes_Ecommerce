import { getSupabaseAdmin } from "./supabaseAdmin";

/**
 * SOLO SERVIDOR. Verifica que la petición venga de un usuario con is_admin = true.
 * Si no, responde 401/403 y devuelve null. Si sí, devuelve { admin, user }.
 */
export async function requireAdmin(req, res) {
  const admin = getSupabaseAdmin();
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ error: "Debes iniciar sesión" });
    return null;
  }
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: "Tu sesión expiró, vuelve a ingresar" });
    return null;
  }
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", data.user.id).maybeSingle();
  if (!profile?.is_admin) {
    res.status(403).json({ error: "No tienes permisos de administrador" });
    return null;
  }
  return { admin, user: data.user };
}

export function slugify(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const SHIPPING_STATUS = ["PREPARANDO", "ENVIADO", "ENTREGADO"];
