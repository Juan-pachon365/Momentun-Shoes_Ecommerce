// Lógica compartida entre la cotización de envío y el pago (solo servidor).
import { finalPrice } from "./format";

export class ErrorPedido extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Usuario a partir del token "Authorization: Bearer ..." */
export async function usuarioDeToken(admin, req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) throw new ErrorPedido(401, "Debes iniciar sesión para pagar");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new ErrorPedido(401, "Tu sesión expiró, vuelve a ingresar");
  return data.user;
}

/** Dirección del usuario (con su ciudad) */
export async function direccionDelUsuario(admin, userId, addressId) {
  if (!addressId) throw new ErrorPedido(400, "Selecciona una dirección de envío");
  const { data } = await admin
    .from("addresses")
    .select("id, title, name, address, house_apartment, locality, city, city_code, postal_code, phone")
    .eq("id", addressId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new ErrorPedido(400, "La dirección seleccionada no existe");
  return data;
}

/**
 * Valida el carrito con precios y stock actuales de la base de datos.
 * Devuelve { lineas: [...productos del pedido], total, pares }
 */
export async function validarCarrito(admin, items) {
  if (!Array.isArray(items) || items.length === 0) throw new ErrorPedido(400, "El carrito está vacío");
  if (items.length > 50) throw new ErrorPedido(400, "Demasiados productos en el carrito");

  const grouped = {};
  for (const item of items) {
    const quantity = parseInt(item.quantity, 10);
    const size = parseInt(item.size, 10);
    if (!item.productId || !Number.isInteger(size) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new ErrorPedido(400, "Hay un producto inválido en el carrito");
    }
    const key = `${item.productId}-${size}`;
    grouped[key] = grouped[key]
      ? { ...grouped[key], quantity: grouped[key].quantity + quantity }
      : { productId: item.productId, size, quantity };
  }
  const lines = Object.values(grouped);

  const productIds = [...new Set(lines.map((l) => l.productId))];
  const { data: products, error } = await admin
    .from("products")
    .select("id, uid, name, price, discount, cover, product_sizes(numero, stock)")
    .in("id", productIds);
  if (error) throw error;

  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const lineas = [];
  let total = 0;
  let pares = 0;

  for (const line of lines) {
    const product = byId[line.productId];
    if (!product) throw new ErrorPedido(409, "Un producto del carrito ya no está disponible");
    const stock = product.product_sizes.find((s) => s.numero === line.size)?.stock ?? 0;
    if (stock < line.quantity) {
      throw new ErrorPedido(409, `${product.name.trim()} talla ${line.size}: solo quedan ${stock} unidades`);
    }
    const unitPrice = finalPrice(product.price, product.discount);
    total += unitPrice * line.quantity;
    pares += line.quantity;
    lineas.push({
      product_id: product.id,
      uid: product.uid,
      name: product.name.trim(),
      cover: product.cover,
      size: line.size,
      quantity: line.quantity,
      unit_price: unitPrice,
    });
  }
  return { lineas, total, pares };
}
