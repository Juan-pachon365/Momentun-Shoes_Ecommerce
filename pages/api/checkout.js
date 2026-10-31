import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { integritySignature } from "@/lib/wompi";
import { finalPrice } from "@/lib/format";

/**
 * POST /api/checkout
 * Body: { items: [{ productId, size, quantity }], addressId }
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

    // 1. Usuario autenticado
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Debes iniciar sesión para pagar" });
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) return res.status(401).json({ error: "Tu sesión expiró, vuelve a ingresar" });
    const user = userData.user;

    // 2. Datos de entrada
    const { items, addressId } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "El carrito está vacío" });
    }
    if (items.length > 50) return res.status(400).json({ error: "Demasiados productos en el carrito" });
    if (!addressId) return res.status(400).json({ error: "Selecciona una dirección de envío" });

    // Agrupar por producto + talla
    const grouped = {};
    for (const item of items) {
      const quantity = parseInt(item.quantity, 10);
      const size = parseInt(item.size, 10);
      if (!item.productId || !Number.isInteger(size) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return res.status(400).json({ error: "Hay un producto inválido en el carrito" });
      }
      const key = `${item.productId}-${size}`;
      grouped[key] = grouped[key]
        ? { ...grouped[key], quantity: grouped[key].quantity + quantity }
        : { productId: item.productId, size, quantity };
    }
    const lines = Object.values(grouped);

    // 3. Dirección del usuario
    const { data: address } = await admin
      .from("addresses")
      .select("id, title, name, address, house_apartment, locality, city, postal_code, phone")
      .eq("id", addressId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!address) return res.status(400).json({ error: "La dirección seleccionada no existe" });

    // 4. Precios y stock actuales
    const productIds = [...new Set(lines.map((l) => l.productId))];
    const { data: products, error: productsError } = await admin
      .from("products")
      .select("id, uid, name, price, discount, cover, product_sizes(numero, stock)")
      .in("id", productIds);
    if (productsError) throw productsError;

    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    const orderProducts = [];
    let total = 0;

    for (const line of lines) {
      const product = byId[line.productId];
      if (!product) return res.status(409).json({ error: "Un producto del carrito ya no está disponible" });
      const sizeRow = product.product_sizes.find((s) => s.numero === line.size);
      const stock = sizeRow?.stock ?? 0;
      if (stock < line.quantity) {
        return res.status(409).json({
          error: `${product.name.trim()} talla ${line.size}: solo quedan ${stock} unidades`,
        });
      }
      const unitPrice = finalPrice(product.price, product.discount);
      total += unitPrice * line.quantity;
      orderProducts.push({
        product_id: product.id,
        uid: product.uid,
        name: product.name.trim(),
        cover: product.cover,
        size: line.size,
        quantity: line.quantity,
        unit_price: unitPrice,
      });
    }

    if (total < 1500) return res.status(400).json({ error: "El valor mínimo de compra es $1.500" });

    // 5. Crear pedido PENDING (la referencia de Wompi será el id del pedido)
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        total_payment: total,
        address_shipping: address,
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
    console.error("[checkout]", error);
    return res.status(500).json({ error: "No se pudo iniciar el pago. Intenta de nuevo." });
  }
}
