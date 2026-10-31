import crypto from "crypto";
import { getSupabaseAdmin } from "./supabaseAdmin";

// SOLO SERVIDOR.
export function wompiApiBase() {
  const key = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || "";
  return key.startsWith("pub_prod_") ? "https://production.wompi.co/v1" : "https://sandbox.wompi.co/v1";
}

export function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// Firma de integridad: SHA256(<referencia><monto en centavos><moneda><secreto de integridad>)
export function integritySignature(reference, amountInCents, currency = "COP") {
  const secret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!secret) throw new Error("Falta WOMPI_INTEGRITY_SECRET en .env.local");
  return sha256(`${reference}${amountInCents}${currency}${secret}`);
}

const VALID_STATUS = ["PENDING", "APPROVED", "DECLINED", "VOIDED", "ERROR"];

/**
 * Sincroniza el estado de una transacción de Wompi con el pedido en Supabase.
 * La referencia de la transacción es el id del pedido.
 * Al pasar a APPROVED, el trigger on_order_approved descuenta el stock.
 */
export async function syncTransaction(transaction) {
  const admin = getSupabaseAdmin();
  const orderId = transaction.reference;

  const { data: order, error } = await admin
    .from("orders")
    .select("id, total_payment, status_payment, id_payment")
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw error;
  if (!order) return { ok: false, reason: "Pedido no encontrado" };

  // El monto pagado debe coincidir con el total del pedido
  const expectedCents = Math.round(Number(order.total_payment) * 100);
  if (Number(transaction.amount_in_cents) !== expectedCents) {
    return { ok: false, reason: "El monto de la transacción no coincide con el pedido", order };
  }

  const status = VALID_STATUS.includes(transaction.status) ? transaction.status : "ERROR";

  // Un pedido aprobado no se devuelve a otro estado por eventos atrasados
  if (order.status_payment === "APPROVED" && status !== "VOIDED") {
    return { ok: true, order };
  }

  if (order.status_payment !== status || order.id_payment !== transaction.id) {
    const { data: updated, error: updateError } = await admin
      .from("orders")
      .update({ status_payment: status, id_payment: transaction.id })
      .eq("id", orderId)
      .select("id, total_payment, status_payment, id_payment")
      .single();
    if (updateError) throw updateError;
    return { ok: true, order: updated };
  }

  return { ok: true, order };
}
