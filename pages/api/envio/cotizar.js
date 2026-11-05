import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { cotizarEnvio, destinoDeDireccion } from "@/lib/envios";
import { ErrorPedido, direccionDelUsuario, usuarioDeToken, validarCarrito } from "@/lib/pedido";

/**
 * POST /api/envio/cotizar
 * Body: { addressId, items: [{ productId, size, quantity }] }
 * Devuelve { opciones: [{ id, carrierName, serviceName, price, estimate, date }] }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }
  try {
    const admin = getSupabaseAdmin();
    const user = await usuarioDeToken(admin, req);
    const address = await direccionDelUsuario(admin, user.id, req.body?.addressId);
    const destino = await destinoDeDireccion(admin, address);
    if (!destino) {
      return res.status(422).json({ error: "Elige la ciudad de esta dirección para calcular el envío", sinCiudad: true });
    }
    const { total, pares } = await validarCarrito(admin, req.body?.items);
    const opciones = await cotizarEnvio({ destino, pares, valor: total });
    if (!opciones.length) {
      return res.status(502).json({ error: "No pudimos cotizar el envío a esa ciudad en este momento. Intenta de nuevo en unos minutos." });
    }
    return res.status(200).json({ opciones });
  } catch (error) {
    if (error instanceof ErrorPedido) return res.status(error.status).json({ error: error.message });
    console.error("[envio/cotizar]", error);
    return res.status(500).json({ error: "No se pudo calcular el envío. Intenta de nuevo." });
  }
}
