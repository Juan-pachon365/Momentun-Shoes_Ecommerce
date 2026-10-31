import { requireAdmin } from "@/lib/adminAuth";

const LOW_STOCK = 2; // una talla con 2 unidades o menos se considera "por agotarse"

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { admin } = ctx;

  try {
    const [usuarios, pedidos, productos] = await Promise.all([
      admin.from("profiles").select("id, created_at"),
      admin.from("orders").select("status_payment, shipping_status, total_payment, products, created_at"),
      admin.from("products").select("id, uid, name, cover, category:categories(title), product_sizes(numero, stock)"),
    ]);
    if (usuarios.error) throw usuarios.error;
    if (pedidos.error) throw pedidos.error;
    if (productos.error) throw productos.error;

    const aprobados = pedidos.data.filter((o) => o.status_payment === "APPROVED");
    const totalVendido = aprobados.reduce((acc, o) => acc + Number(o.total_payment || 0), 0);
    const porEnviar = aprobados.filter((o) => o.shipping_status === "PREPARANDO").length;

    // Unidades vendidas por producto (solo pedidos aprobados)
    const vendidos = {};
    for (const o of aprobados) {
      for (const item of Array.isArray(o.products) ? o.products : []) {
        const id = item.product_id;
        if (!id) continue;
        vendidos[id] = vendidos[id] || { unidades: 0, name: item.name, uid: item.uid, cover: item.cover };
        vendidos[id].unidades += Number(item.quantity) || 1;
      }
    }
    const porId = Object.fromEntries(productos.data.map((p) => [p.id, p]));
    const ranking = Object.entries(vendidos)
      .map(([id, v]) => ({
        id,
        unidades: v.unidades,
        name: (porId[id]?.name || v.name || "").trim(),
        uid: porId[id]?.uid || v.uid,
        cover: porId[id]?.cover || v.cover,
      }))
      .sort((a, b) => b.unidades - a.unidades)
      .slice(0, 5);

    let tallasAgotadas = 0;
    let tallasBajas = 0;
    let stockTotal = 0;
    for (const p of productos.data) {
      for (const s of p.product_sizes) {
        stockTotal += s.stock;
        if (s.stock === 0) tallasAgotadas++;
        else if (s.stock <= LOW_STOCK) tallasBajas++;
      }
    }

    // ----- Datos para los gráficos -----
    const DIAS = 30;
    const diaBogota = (fecha) => new Date(fecha).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
    const hoy = new Date();
    const serie = [];
    for (let i = DIAS - 1; i >= 0; i--) {
      const d = new Date(hoy.getTime() - i * 86400000);
      serie.push({ fecha: diaBogota(d), ventas: 0, pedidos: 0 });
    }
    const porFecha = Object.fromEntries(serie.map((d) => [d.fecha, d]));
    for (const o of aprobados) {
      const d = porFecha[diaBogota(o.created_at)];
      if (d) {
        d.ventas += Number(o.total_payment || 0);
        d.pedidos += 1;
      }
    }
    const desde = new Date(hoy.getTime() - DIAS * 86400000);
    const usuariosNuevos = usuarios.data.filter((u) => u.created_at && new Date(u.created_at) >= desde).length;

    const porEstado = { APPROVED: 0, PENDING: 0, DECLINED: 0, VOIDED: 0, ERROR: 0 };
    for (const o of pedidos.data) if (o.status_payment in porEstado) porEstado[o.status_payment] += 1;

    const porCategoria = {};
    for (const [id, v] of Object.entries(vendidos)) {
      const cat = porId[id]?.category?.title || "Sin categoría";
      porCategoria[cat] = (porCategoria[cat] || 0) + v.unidades;
    }

    return res.status(200).json({
      usuarios: usuarios.data.length,
      usuariosNuevos,
      serie,
      porEstado,
      porCategoria: Object.entries(porCategoria)
        .map(([categoria, unidades]) => ({ categoria, unidades }))
        .sort((a, b) => b.unidades - a.unidades),
      pedidosTotales: pedidos.data.length,
      pedidosAprobados: aprobados.length,
      pedidosPendientes: pedidos.data.filter((o) => o.status_payment === "PENDING").length,
      porEnviar,
      totalVendido,
      productos: productos.data.length,
      stockTotal,
      tallasAgotadas,
      tallasBajas,
      masVendidos: ranking,
    });
  } catch (error) {
    console.error("[admin/resumen]", error);
    return res.status(500).json({ error: "No se pudo cargar el resumen" });
  }
}
