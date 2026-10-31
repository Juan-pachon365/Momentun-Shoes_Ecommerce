import { requireAdmin, SHIPPING_STATUS } from "@/lib/adminAuth";

const PAGO = ["PENDING", "APPROVED", "DECLINED", "VOIDED", "ERROR"];

export default async function handler(req, res) {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { admin } = ctx;

  try {
    if (req.method === "GET") {
      let query = admin
        .from("orders")
        .select("id, user_id, total_payment, id_payment, status_payment, shipping_status, address_shipping, products, created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      const estado = req.query.estado;
      if (typeof estado === "string" && PAGO.includes(estado)) query = query.eq("status_payment", estado);
      const envio = req.query.envio;
      if (typeof envio === "string" && SHIPPING_STATUS.includes(envio)) query = query.eq("shipping_status", envio);

      const { data: pedidos, error } = await query;
      if (error) throw error;

      // Nombre y correo de cada cliente
      const ids = [...new Set(pedidos.map((o) => o.user_id).filter(Boolean))];
      const clientes = {};
      if (ids.length) {
        const { data: perfiles } = await admin.from("profiles").select("id, firstname, lastname").in("id", ids);
        (perfiles || []).forEach((p) => (clientes[p.id] = { nombre: [p.firstname, p.lastname].filter(Boolean).join(" ") }));
        await Promise.all(
          ids.map(async (id) => {
            try {
              const { data } = await admin.auth.admin.getUserById(id);
              clientes[id] = { ...(clientes[id] || {}), email: data?.user?.email || "" };
            } catch {
              // Si no se puede leer el correo de un cliente, se muestra el pedido sin él
            }
          })
        );
      }

      return res.status(200).json({
        pedidos: pedidos.map((o) => ({ ...o, cliente: clientes[o.user_id] || {} })),
      });
    }

    if (req.method === "PATCH") {
      const { id, shipping_status } = req.body || {};
      if (!id || !SHIPPING_STATUS.includes(shipping_status)) {
        return res.status(400).json({ error: "Estado de envío inválido" });
      }
      const { data: pedido } = await admin.from("orders").select("status_payment").eq("id", id).maybeSingle();
      if (!pedido) return res.status(404).json({ error: "Pedido no encontrado" });
      if (pedido.status_payment !== "APPROVED") {
        return res.status(409).json({ error: "Solo se puede cambiar el envío de pedidos con pago aprobado" });
      }
      const { data, error } = await admin
        .from("orders")
        .update({ shipping_status })
        .eq("id", id)
        .select("id, shipping_status")
        .single();
      if (error) throw error;
      return res.status(200).json({ pedido: data });
    }

    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (error) {
    console.error("[admin/pedidos]", error);
    return res.status(500).json({ error: "No se pudo completar la operación con los pedidos" });
  }
}
