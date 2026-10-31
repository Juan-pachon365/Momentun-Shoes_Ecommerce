import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { getAvailableSizes, getBrands, getCategories, getProducts, SORT_OPTIONS } from "@/lib/catalog";
import { buildPriceRanges, filterByPrice, parsePriceRange, sortByFinalPrice } from "@/lib/catalogFilters";
import { Seo } from "@/components/Seo";
import { CatalogCard } from "@/components/CatalogCard";
import { EmptyState } from "@/components/EmptyState";
import { IconClose, IconSearch } from "@/components/Icons";
import styles from "@/styles/Catalog.module.scss";

const IconFiltros = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </svg>
);

export default function Catalogo({ products, categories, brands, sizes, priceRanges, filters }) {
  const router = useRouter();
  const [ocultos, setOcultos] = useState(false); // escritorio: ocultar barra de filtros
  const [panel, setPanel] = useState(false); // celular: panel de filtros a pantalla completa

  useEffect(() => {
    document.body.style.overflow = panel ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [panel]);

  const setFilter = (key, value) => {
    const query = { ...router.query };
    if (value === undefined || value === null || value === "" || query[key] === String(value)) delete query[key];
    else query[key] = value;
    router.push({ pathname: "/catalogo", query }, undefined, { scroll: false });
  };

  const categoria = categories.find((c) => c.slug === filters.categoria);
  const marca = brands.find((b) => b.slug === filters.marca);
  const rango = priceRanges.find((r) => r.value === filters.precio);
  const titulo = categoria ? categoria.title : marca ? marca.name : filters.q ? `"${filters.q}"` : "Calzado";

  const chips = [
    categoria && { key: "categoria", label: categoria.title },
    marca && { key: "marca", label: marca.name },
    filters.talla && { key: "talla", label: `Talla ${filters.talla}` },
    filters.precio && { key: "precio", label: rango?.label || "Precio" },
    filters.oferta && { key: "oferta", label: "En oferta" },
    filters.q && { key: "q", label: `"${filters.q}"` },
  ].filter(Boolean);

  // Se guarda como elemento (no como componente) para que no se reinicie en cada render
  const filtros = (
    <>
      <form
        className={styles.searchBox}
        onSubmit={(e) => {
          e.preventDefault();
          setFilter("q", e.target.q.value.trim());
        }}
        role="search"
      >
        <IconSearch />
        <input key={filters.q} name="q" type="search" placeholder="Buscar en el catálogo" defaultValue={filters.q} aria-label="Buscar en el catálogo" />
      </form>

      <details className={styles.group} open>
        <summary>Categoría</summary>
        <div className={styles.options}>
          {categories.map((c) => (
            <button key={c.id} className={styles.check} onClick={() => setFilter("categoria", c.slug)} aria-pressed={filters.categoria === c.slug}>
              <span className={styles.box} aria-hidden="true" />
              {c.title}
            </button>
          ))}
        </div>
      </details>

      <details className={styles.group} open>
        <summary>Marca</summary>
        <div className={styles.options}>
          {brands.map((b) => (
            <button key={b.id} className={styles.check} onClick={() => setFilter("marca", b.slug)} aria-pressed={filters.marca === b.slug}>
              <span className={styles.box} aria-hidden="true" />
              {b.name}
            </button>
          ))}
        </div>
      </details>

      <details className={styles.group} open>
        <summary>Talla</summary>
        <div className={styles.sizes}>
          {sizes.map((s) => (
            <button key={s} className={styles.size} onClick={() => setFilter("talla", s)} aria-pressed={String(filters.talla) === String(s)}>
              {s}
            </button>
          ))}
        </div>
      </details>

      {priceRanges.length > 0 && (
        <details className={styles.group} open>
          <summary>Precio</summary>
          <div className={styles.options}>
            {priceRanges.map((r) => (
              <button key={r.value} className={styles.check} onClick={() => setFilter("precio", r.value)} aria-pressed={filters.precio === r.value}>
                <span className={`${styles.box} ${styles.round}`} aria-hidden="true" />
                {r.label}
                <span className={styles.count}>{r.count}</span>
              </button>
            ))}
          </div>
        </details>
      )}

      <details className={styles.group} open>
        <summary>Ofertas</summary>
        <button className={styles.switchRow} onClick={() => setFilter("oferta", "1")} role="switch" aria-checked={!!filters.oferta}>
          Solo productos con descuento
          <span className={styles.switch} aria-hidden="true" />
        </button>
      </details>
    </>
  );

  return (
    <div className={styles.catalog}>
      <Seo title={categoria ? categoria.title : "Catálogo"} />

      {/* Barra superior fija */}
      <div className={styles.toolbar}>
        <div className={`container ${styles.toolbarInner}`}>
          <h1 className={styles.title}>
            {titulo} <span>({products.length})</span>
          </h1>
          <div className={styles.toolbarActions}>
            <button className={`${styles.toolBtn} ${styles.desktopOnly}`} onClick={() => setOcultos((v) => !v)} aria-expanded={!ocultos}>
              {ocultos ? "Mostrar filtros" : "Ocultar filtros"} <IconFiltros />
            </button>
            <button className={`${styles.toolBtn} ${styles.mobileOnly}`} onClick={() => setPanel(true)}>
              Filtrar {chips.length > 0 && <span className={styles.badgeCount}>{chips.length}</span>} <IconFiltros />
            </button>
            <label className={styles.sort}>
              <span>Ordenar por</span>
              <select value={filters.orden} onChange={(e) => setFilter("orden", e.target.value === "recientes" ? "" : e.target.value)}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Accesos rápidos a categorías */}
        <nav className={styles.pills} aria-label="Categorías">
          <Link href="/catalogo" className={`${styles.pill} ${!filters.categoria ? styles.pillActive : ""}`} scroll={false}>
            Todo
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/catalogo?categoria=${c.slug}`}
              className={`${styles.pill} ${filters.categoria === c.slug ? styles.pillActive : ""}`}
              scroll={false}
            >
              {c.title}
            </Link>
          ))}
        </nav>

        {chips.length > 0 && (
          <div className={styles.chips}>
            {chips.map((c) => (
              <button key={c.key} className={styles.chip} onClick={() => setFilter(c.key, "")}>
                {c.label} <IconClose />
              </button>
            ))}
            <Link href="/catalogo" className={styles.clear} scroll={false}>
              Borrar filtros
            </Link>
          </div>
        )}

        <div className={`${styles.layout} ${ocultos ? styles.layoutWide : ""}`}>
          {!ocultos && (
            <aside className={`${styles.filters} ${styles.desktopOnly}`} aria-label="Filtros">
              {filtros}
            </aside>
          )}

          <section className={styles.results} aria-live="polite">
            {products.length > 0 ? (
              <div className={styles.grid}>
                {products.map((p, i) => (
                  <CatalogCard key={p.id} product={p} priority={i < 3} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<IconSearch />}
                title="No encontramos zapatos con estos filtros"
                text="Quita algún filtro o mira todo el catálogo."
                actionHref="/catalogo"
                actionLabel="Ver todo el catálogo"
              />
            )}
          </section>
        </div>
      </div>

      {/* Panel de filtros en el celular */}
      {panel && (
        <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Filtrar">
          <div className={styles.sheetHead}>
            <strong>Filtrar</strong>
            <button onClick={() => setPanel(false)} aria-label="Cerrar filtros">
              <IconClose />
            </button>
          </div>
          <div className={styles.sheetBody}>
            {filtros}
          </div>
          <div className={styles.sheetFoot}>
            {chips.length > 0 && (
              <Link href="/catalogo" className="btn btn-outline" scroll={false}>
                Borrar
              </Link>
            )}
            <button className="btn btn-primary" onClick={() => setPanel(false)}>
              Ver {products.length} {products.length === 1 ? "resultado" : "resultados"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps({ query }) {
  const filters = {
    categoria: typeof query.categoria === "string" ? query.categoria : "",
    marca: typeof query.marca === "string" ? query.marca : "",
    talla: typeof query.talla === "string" && /^\d+$/.test(query.talla) ? query.talla : "",
    q: typeof query.q === "string" ? query.q.slice(0, 60) : "",
    oferta: query.oferta === "1" ? "1" : "",
    precio: typeof query.precio === "string" && parsePriceRange(query.precio) ? query.precio : "",
    orden: typeof query.orden === "string" ? query.orden : "recientes",
  };

  try {
    const [todos, categories, brands, sizes] = await Promise.all([
      getProducts({ ...filters, oferta: !!filters.oferta }),
      getCategories(),
      getBrands(),
      getAvailableSizes(),
    ]);
    // Los rangos de precio se calculan con los demás filtros aplicados (sin el de precio)
    const priceRanges = buildPriceRanges(todos);
    const products = sortByFinalPrice(filterByPrice(todos, parsePriceRange(filters.precio)), filters.orden);
    return { props: { products, categories, brands, sizes, priceRanges, filters } };
  } catch (error) {
    console.error(error);
    return { props: { products: [], categories: [], brands: [], sizes: [], priceRanges: [], filters } };
  }
}
