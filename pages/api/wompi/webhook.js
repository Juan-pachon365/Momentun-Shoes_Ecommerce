import { sha256, syncTransaction } from "@/lib/wompi";

/**
 * POST /api/wompi/webhook
 * Configura esta URL en el Dashboard de Wompi > Desarrolladores > URL de eventos:
 *   https://TU-DOMINIO/api/wompi/webhook
 * Verifica la firma del evento con WOMPI_EVENTS_SECRET antes de tocar el pedido.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  const secret = process.env.WOMPI_EVENTS_SECRET;
  if (!secret) {
    console.error("[wompi/webhook] Falta WOMPI_EVENTS_SECRET");
    return res.status(500).json({ error: "Webhook no configurado" });
  }

  const event = req.body;
  try {
    const properties = event?.signature?.properties || [];
    const values = properties.map((path) =>
      path.split(".").reduce((obj, key) => (obj == null ? undefined : obj[key]), event.data)
    );
    const expected = sha256(`${values.join("")}${event.timestamp}${secret}`);
    const received = event?.signature?.checksum || req.headers["x-event-checksum"];

    if (!received || expected.toLowerCase() !== String(received).toLowerCase()) {
      return res.status(401).json({ error: "Firma inválida" });
    }

    if (event.event === "transaction.updated" && event.data?.transaction) {
      const result = await syncTransaction(event.data.transaction);
      if (!result.ok) console.warn("[wompi/webhook]", result.reason, event.data.transaction.reference);
    }

    // Wompi espera un 200 para no reintentar
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[wompi/webhook]", error);
    return res.status(500).json({ error: "Error procesando el evento" });
  }
}
