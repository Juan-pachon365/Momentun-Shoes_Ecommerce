import { finalPrice, formatPrice } from "./format";

const redondear = (v) => Math.round(v / 1000) * 1000;

/**
 * Arma hasta 3 rangos de precio a partir de los productos visibles.
 * Devuelve [{ value: "min-max", label, count }] (max vacío = sin tope).
 */
export function buildPriceRanges(products) {
  const precios = products.map((p) => finalPrice(p.price, p.discount)).sort((a, b) => a - b);
  if (precios.length < 2) return [];
  const min = precios[0];
  const max = precios[precios.length - 1];
  if (max - min < 3000) return [];

  const b1 = redondear(min + (max - min) / 3);
  const b2 = redondear(min + ((max - min) * 2) / 3);
  const rangos =
    b1 >= b2
      ? [
          { min: 0, max: b1, label: `Hasta ${formatPrice(b1)}` },
          { min: b1 + 1, max: null, label: `Más de ${formatPrice(b1)}` },
        ]
      : [
          { min: 0, max: b1, label: `Hasta ${formatPrice(b1)}` },
          { min: b1 + 1, max: b2, label: `${formatPrice(b1 + 1)} – ${formatPrice(b2)}` },
          { min: b2 + 1, max: null, label: `Más de ${formatPrice(b2)}` },
        ];

  return rangos
    .map((r) => ({
      value: `${r.min}-${r.max ?? ""}`,
      label: r.label,
      count: precios.filter((v) => v >= r.min && (r.max === null || v <= r.max)).length,
    }))
    .filter((r) => r.count > 0);
}

export function parsePriceRange(value) {
  if (typeof value !== "string") return null;
  const m = value.match(/^(\d+)-(\d*)$/);
  if (!m) return null;
  return { min: Number(m[1]), max: m[2] ? Number(m[2]) : null };
}

export function filterByPrice(products, range) {
  if (!range) return products;
  return products.filter((p) => {
    const v = finalPrice(p.price, p.discount);
    return v >= range.min && (range.max === null || v <= range.max);
  });
}

export function sortByFinalPrice(products, orden) {
  if (orden !== "precio-asc" && orden !== "precio-desc") return products;
  const dir = orden === "precio-asc" ? 1 : -1;
  return [...products].sort((a, b) => dir * (finalPrice(a.price, a.discount) - finalPrice(b.price, b.discount)));
}

// ───────── Filtros en el navegador (el catálogo se descarga una vez y se filtra al instante) ─────────

const normalizar = (t) =>
  String(t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

/** Lee los filtros de la URL (?categoria=&marca=&talla=&q=&oferta=&precio=&orden=) */
export function parseFilters(query = {}) {
  const s = (v) => (typeof v === "string" ? v : "");
  return {
    categoria: s(query.categoria),
    marca: s(query.marca),
    talla: /^\d+$/.test(s(query.talla)) ? s(query.talla) : "",
    q: s(query.q).slice(0, 60),
    oferta: query.oferta === "1" ? "1" : "",
    precio: parsePriceRange(s(query.precio)) ? s(query.precio) : "",
    orden: s(query.orden) || "recientes",
  };
}

/** Tallas con stock en algún producto, ordenadas */
export function availableSizes(products) {
  const set = new Set();
  for (const p of products) for (const t of p.product_sizes || []) if (t.stock > 0) set.add(t.numero);
  return [...set].sort((a, b) => a - b);
}

/** Aplica los filtros y devuelve { products, priceRanges } */
export function applyFilters(all, f) {
  const q = normalizar(f.q);
  const talla = f.talla ? Number(f.talla) : null;
  let list = all.filter(
    (p) =>
      (!f.categoria || p.category?.slug === f.categoria) &&
      (!f.marca || p.brand?.slug === f.marca) &&
      (!talla || (p.product_sizes || []).some((t) => t.numero === talla && t.stock > 0)) &&
      (!f.oferta || Number(p.discount) > 0) &&
      (!q || normalizar(`${p.name} ${p.brand?.name || ""} ${p.category?.title || ""}`).includes(q))
  );

  // Los rangos de precio se calculan con los demás filtros aplicados (sin el de precio)
  const priceRanges = buildPriceRanges(list);
  list = filterByPrice(list, parsePriceRange(f.precio));

  if (f.orden === "nombre") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
  else if (f.orden === "precio-asc" || f.orden === "precio-desc") list = sortByFinalPrice(list, f.orden);
  else list = [...list].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  return { products: list, priceRanges };
}
