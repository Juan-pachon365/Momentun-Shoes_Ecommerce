import crypto from "crypto";
import { requireAdmin, slugify } from "@/lib/adminAuth";

/**
 * POST /api/admin/firma-imagen  { uid, nombre }
 * Devuelve una firma para que el navegador suba UNA imagen directo a Cloudinary,
 * en momentum-shoes/<uid>/<nombre>, sin exponer el API secret.
 * nombre: cover | wallpaper | gallery-1 ... gallery-20
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ error: "Faltan las credenciales de Cloudinary en .env.local" });
  }

  const uid = slugify(req.body?.uid);
  const nombre = String(req.body?.nombre || "");
  if (!uid || uid !== req.body?.uid) return res.status(400).json({ error: "uid inválido" });
  if (!/^(cover|wallpaper|gallery-([1-9]|1\d|20))$/.test(nombre)) return res.status(400).json({ error: "Nombre de imagen inválido" });

  const params = {
    folder: `momentum-shoes/${uid}`,
    overwrite: "true",
    public_id: nombre,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  // Firma de Cloudinary: SHA-1 de los parámetros ordenados + API secret
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const signature = crypto.createHash("sha1").update(base + apiSecret).digest("hex");

  return res.status(200).json({
    url: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    fields: { ...params, api_key: apiKey, signature },
  });
}
