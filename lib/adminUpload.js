import { apiFetch } from "./apiClient";

/**
 * Sube una imagen directo del navegador a Cloudinary con una firma del servidor.
 * nombre: cover | wallpaper | gallery-N. Devuelve la URL segura.
 */
export async function subirImagen(file, uid, nombre) {
  if (!file.type.startsWith("image/")) throw new Error(`"${file.name}" no es una imagen`);
  if (file.size > 10 * 1024 * 1024) throw new Error(`"${file.name}" pesa más de 10 MB`);
  const { url, fields } = await apiFetch("/api/admin/firma-imagen", { method: "POST", body: { uid, nombre } });
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  form.append("file", file);
  const res = await fetch(url, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `No se pudo subir "${file.name}"`);
  return data.secure_url;
}
