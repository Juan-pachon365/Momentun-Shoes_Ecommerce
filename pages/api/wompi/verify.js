import { syncTransaction, wompiApiBase } from "@/lib/wompi";

/**
 * GET /api/wompi/verify?id=<id de transacción>
 * Consulta la transacción directamente en Wompi (fuente de verdad) y actualiza el pedido.
 * Se usa en la página /pago/resultado; el webhook hace lo mismo en segundo plano.
 */
export default async function handler(req, res) {
  const { id } = req.query;
  if (typeof id !== "string" || !/^[\w-]{5,80}$/.test(id)) {
    return res.status(400).json({ error: "Transacción inválida" });
  }

  try {
    const response = await fetch(`${wompiApiBase()}/transactions/${encodeURIComponent(id)}`);
    if (!response.ok) return res.status(404).json({ error: "No encontramos la transacción en Wompi" });
    const { data: transaction } = await response.json();

    const result = await syncTransaction(transaction);

    return res.status(200).json({
      status: transaction.status,
      reference: transaction.reference,
      amountInCents: transaction.amount_in_cents,
      paymentMethod: transaction.payment_method_type,
      orderStatus: result.order?.status_payment ?? null,
      warning: result.ok ? null : result.reason,
    });
  } catch (error) {
    console.error("[wompi/verify]", error);
    return res.status(500).json({ error: "No se pudo verificar el pago" });
  }
}
