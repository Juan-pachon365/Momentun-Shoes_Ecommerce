import { supabase } from "./supabase";

const PRODUCT_FIELDS =
  "id, uid, name, price, discount, cover, image_gallery, created_at, category:categories(id, title, slug), brand:brands(id, name, slug), product_sizes(numero, stock)";

export async function getCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, title, slug, icon, order")
    .order("order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getBrands() {
  const { data, error } = await supabase.from("brands").select("id, name, slug, logo").order("name");
  if (error) throw error;
  return data;
}

export async function getAvailableSizes() {
  const { data, error } = await supabase.from("product_sizes").select("numero").gt("stock", 0);
  if (error) throw error;
  return [...new Set(data.map((s) => s.numero))].sort((a, b) => a - b);
}

export const SORT_OPTIONS = [
  { value: "recientes", label: "Más recientes" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
  { value: "nombre", label: "Nombre A-Z" },
];

/**
 * Busca productos con filtros opcionales:
 * { categoria: slug, marca: slug, talla: número, q: texto, orden, limit }
 */
export async function getProducts({ categoria, marca, talla, q, oferta, orden = "recientes", limit } = {}) {
  let fields = PRODUCT_FIELDS;
  if (categoria) fields = fields.replace("category:categories(", "category:categories!inner(");
  if (marca) fields = fields.replace("brand:brands(", "brand:brands!inner(");
  if (talla) fields = fields.replace("product_sizes(", "product_sizes!inner(");

  let query = supabase.from("products").select(fields);

  if (categoria) query = query.eq("category.slug", categoria);
  if (marca) query = query.eq("brand.slug", marca);
  if (talla) query = query.eq("product_sizes.numero", Number(talla)).gt("product_sizes.stock", 0);
  if (q) query = query.ilike("name", `%${q.trim()}%`);
  if (oferta) query = query.gt("discount", 0);

  if (orden === "precio-asc") query = query.order("price", { ascending: true });
  else if (orden === "precio-desc") query = query.order("price", { ascending: false });
  else if (orden === "nombre") query = query.order("name", { ascending: true });
  else query = query.order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getProductByUid(uid) {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, uid, name, price, discount, description, cover, wallpaper, image_gallery, created_at, category:categories(id, title, slug), brand:brands(id, name, slug, logo), product_sizes(id, numero, stock)"
    )
    .eq("uid", uid)
    .order("numero", { referencedTable: "product_sizes", ascending: true })
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProductsByIds(ids) {
  if (!ids?.length) return [];
  const { data, error } = await supabase.from("products").select(PRODUCT_FIELDS).in("id", ids);
  if (error) throw error;
  return data;
}
