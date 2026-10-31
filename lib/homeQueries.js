// Consultas del Home contra Supabase (tablas: categories, brands, products, product_sizes).
// Recibe TU cliente de Supabase (el mismo que ya usas en el proyecto), así no se duplica la configuración.

const KIDS_MAX_SIZE = 33;      // tallas <= 33 se muestran como "Niños"
const LOW_STOCK_LIMIT = 15;    // stock total <= 15 => etiqueta "Últimas tallas"

export async function getHomeData(supabase, { productsLimit = 8 } = {}) {
  const [categoriesRes, brandsRes, productsRes, sizesRes, catalogRes] = await Promise.all([
    supabase.from("categories").select("id, title, slug, order").order("order"),
    supabase.from("brands").select("id, name, slug, logo").order("name"),
    supabase
      .from("products")
      .select(
        "id, uid, name, price, discount, cover, wallpaper, created_at, category:categories(title, slug), brand:brands(name, slug), product_sizes(numero, stock)"
      )
      .order("created_at", { ascending: false })
      .limit(productsLimit),
    supabase.from("product_sizes").select("numero").gt("stock", 0),
    // Todos los productos (campos mínimos) para armar las tarjetas de categoría
    supabase
      .from("products")
      .select("id, name, price, discount, cover, wallpaper, category_id, created_at, product_sizes(stock)")
      .order("created_at", { ascending: false }),
  ]);

  const error =
    categoriesRes.error || brandsRes.error || productsRes.error || sizesRes.error || catalogRes.error;
  if (error) throw error;

  const products = (productsRes.data ?? []).map(normalizeProduct);

  const allSizes = [...new Set((sizesRes.data ?? []).map((s) => s.numero))].sort(
    (a, b) => a - b
  );

  const categories = (categoriesRes.data ?? []).map((c) => categoryStats(c, catalogRes.data ?? []));

  return {
    categories,
    brands: brandsRes.data ?? [],
    products,
    sizes: {
      kids: allSizes.filter((n) => n <= KIDS_MAX_SIZE),
      adults: allSizes.filter((n) => n > KIDS_MAX_SIZE),
    },
  };
}

// Para cada categoría: cuántos modelos tiene, el precio más bajo y una foto real
function categoryStats(category, catalog) {
  const items = catalog.filter((p) => p.category_id === category.id);
  const finalPrice = (p) => {
    const price = Number(p.price);
    const d = Number(p.discount ?? 0);
    return d > 0 ? Math.round(price * (1 - d / 100)) : price;
  };
  const inStock = items.filter((p) => (p.product_sizes ?? []).some((s) => (s.stock ?? 0) > 0));
  // Foto: el producto más nuevo con stock (o el más nuevo si todos están agotados)
  const featured = inStock[0] ?? items[0] ?? null;
  return {
    ...category,
    productCount: items.length,
    minPrice: items.length ? Math.min(...items.map(finalPrice)) : null,
    image: featured?.cover ?? null,
    imageAlt: featured?.name?.trim() ?? "",
  };
}

function normalizeProduct(p) {
  const sizes = p.product_sizes ?? [];
  const stock = sizes.reduce((acc, s) => acc + (s.stock ?? 0), 0);
  const sizesAvailable = sizes.filter((s) => (s.stock ?? 0) > 0).length;
  const price = Number(p.price);
  const discount = Number(p.discount ?? 0);
  const finalPrice = discount > 0 ? Math.round(price * (1 - discount / 100)) : price;

  return {
    id: p.id,
    uid: p.uid,
    name: p.name?.trim(),
    cover: p.cover,
    wallpaper: p.wallpaper,
    brand: p.brand?.name ?? "",
    category: p.category?.title ?? "",
    price,
    discount,
    finalPrice,
    stock,
    sizesAvailable,
    lowStock: stock > 0 && stock <= LOW_STOCK_LIMIT,
    soldOut: stock === 0,
  };
}

export const formatCOP = (value) =>
  "$ " + Number(value).toLocaleString("es-CO", { maximumFractionDigits: 0 });
