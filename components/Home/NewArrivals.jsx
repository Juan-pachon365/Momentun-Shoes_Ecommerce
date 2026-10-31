import Link from "next/link";
import styles from "./Home.module.css";
import { routes } from "./routes";
import { formatCOP } from "@/lib/homeQueries";
import { cdn } from "@/lib/format";
import { WishlistButton } from "@/components/WishlistButton";

export default function NewArrivals({ products, brands }) {
  if (!products?.length) return null;

  return (
    <section className={`${styles.container} ${styles.section}`}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Lo más nuevo</h2>
        <nav className={styles.chips} aria-label="Filtrar por marca">
          <Link href={routes.allProducts} className={`${styles.chip} ${styles.chipActive}`}>
            Todo
          </Link>
          {brands.slice(0, 4).map((b) => (
            <Link key={b.id} href={routes.brand(b.slug)} className={styles.chip}>
              {b.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className={styles.productGrid}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product: p }) {
  return (
    <Link href={routes.product(p.uid)} className={styles.card}>
      <div className={styles.cardImage}>
        {p.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cdn(p.cover, 600)} alt={p.name} loading="lazy" />
        ) : (
          <span className={styles.cardNoImage}>Sin imagen</span>
        )}
        {p.soldOut && <span className={styles.cardTag}>Agotado</span>}
        {!p.soldOut && p.lowStock && <span className={styles.cardTag}>Últimas tallas</span>}
        <span className={styles.cardWish}>
          <WishlistButton productId={p.id} />
        </span>
        {!p.soldOut && !p.lowStock && p.discount > 0 && (
          <span className={`${styles.cardTag} ${styles.cardTagAccent}`}>-{p.discount}%</span>
        )}
      </div>
      <span className={styles.cardBrand}>{p.brand}</span>
      <span className={styles.cardName}>{p.name}</span>
      <span className={styles.cardMeta}>{p.category}</span>
      <span className={styles.cardMeta}>
        {p.sizesAvailable} {p.sizesAvailable === 1 ? "talla disponible" : "tallas disponibles"}
      </span>
      <span className={styles.cardPrice}>
        {formatCOP(p.finalPrice)}
        {p.discount > 0 && <s className={styles.cardOldPrice}>{formatCOP(p.price)}</s>}
      </span>
    </Link>
  );
}
