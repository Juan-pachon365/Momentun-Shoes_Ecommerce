import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { integritySignature } from "@/lib/wompi";
import { cotizarEnvio, destinoDeDireccion } from "@/lib/envios";
import { ErrorPedido, direccionDelUsuario, usuarioDeToken, validarCarrito } from "@/lib/pedido";

/**
 * POST /api/checkout
 * Body: { items: [{ productId, size, quantity }], addressId, envio: "transportadora:servicio" }
 * Header: Authorization: Bearer <access_token de Supabase>
 *
 * Valida usuario, stock y precios EN EL SERVIDOR, crea el pedido en estado PENDING
 * y devuelve la URL del Web Checkout de Wompi firmada con el secreto de integridad.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
    if (!publicKey || !process.env.WOMPI_INTEGRITY_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: "Pagos no configurados: faltan llaves de Wompi o de Supabase en .env.local",
      });
    }

    const admin = getSupabaseAdmin();

    // 1. Usuario, dirección y carrito (precios y stock actuales)
    const user = await usuarioDeToken(admin, req);
    const { items, addressId, envio } = req.body || {};
    const address = await direccionDelUsuario(admin, user.id, addressId);
    const { lineas: orderProducts, total: subtotal, pares } = await validarCarrito(admin, items);
    if (subtotal < 1500) return res.status(400).json({ error: "El valor mínimo de compra es $1.500" });

    // 2. Envío: se vuelve a cotizar aquí para que nadie pueda cambiar el precio desde el navegador
    const destino = await destinoDeDireccion(admin, address);
    if (!destino) return res.status(400).json({ error: "Elige la ciudad de tu dirección para calcular el envío" });
    if (typeof envio !== "string" || !envio) return res.status(400).json({ error: "Elige cómo quieres recibir tu pedido" });
    const opciones = await cotizarEnvio({ destino, pares, valor: subtotal });
    const elegido = opciones.find((o) => o.id === envio);
    if (!elegido) {
      return res.status(409).json({ error: "El precio del envío cambió. Revisa las opciones y elige de nuevo.", recotizar: true });
    }
    const total = subtotal + elegido.price;

    // 5. Crear pedido PENDING (la referencia de Wompi será el id del pedido)
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        total_payment: total,
        address_shipping: address,
        shipping_carrier: elegido.carrierName,
        shipping_service: elegido.serviceName,
        shipping_cost: elegido.price,
        products: orderProducts,
        status_payment: "PENDING",
      })
      .select("id, total_payment")
      .single();
    if (orderError) throw orderError;

    // 6. URL firmada del Web Checkout
    const amountInCents = Math.round(total * 100);
    const reference = order.id;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;

    const params = new URLSearchParams({
      "public-key": publicKey,
      currency: "COP",
      "amount-in-cents": String(amountInCents),
      reference,
      "signature:integrity": integritySignature(reference, amountInCents, "COP"),
      "redirect-url": `${siteUrl.replace(/\/$/, "")}/pago/resultado`,
      "customer-data:email": user.email,
      "customer-data:full-name": address.name,
    });

    return res.status(200).json({
      orderId: order.id,
      url: `https://checkout.wompi.co/p/?${params.toString()}`,
    });
  } catch (error) {
    if (error instanceof ErrorPedido) return res.status(error.status).json({ error: error.message });
    console.error("[checkout]", error);
    return res.status(500).json({ error: "No se pudo iniciar el pago. Intenta de nuevo." });
  }
}
