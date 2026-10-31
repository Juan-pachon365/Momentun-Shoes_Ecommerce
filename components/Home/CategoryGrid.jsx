import Link from "next/link";
import styles from "./Home.module.css";
import { routes } from "./routes";
import { formatCOP } from "@/lib/homeQueries";
import { cdn } from "@/lib/format";

// Color de respaldo por si una categoría todavía no tiene productos con foto
const TILE_COLORS = ["#5414FD", "#5F38C9", "#5D4896", "#4C4463"];

export default function CategoryGrid({ categories }) {
  if (!categories?.length) return null;
  const bento = categories.length === 4;

  return (
    <section className={`${styles.container} ${styles.section}`}>
      <div className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>Compra por estilo</h2>
          <p className={styles.sectionSub}>Elige tu estilo y encuentra tu par.</p>
        </div>
        <Link href={routes.allProducts} className={styles.textLink}>
          Ver todo
        </Link>
      </div>

      <div className={`${styles.catGrid} ${bento ? styles.catBento : ""}`}>
        {categories.map((c, i) => {
          const hasProducts = c.productCount > 0;
          return (
            <Link
              key={c.id}
              href={routes.category(c.slug)}
              className={`${styles.catTile} ${bento && i === 0 ? styles.catTileBig : ""}`}
              style={{ "--tile-color": TILE_COLORS[i % TILE_COLORS.length] }}
              aria-label={`${c.title}: ${hasProducts ? `${c.productCount} modelos desde ${formatCOP(c.minPrice)}` : "próximamente"}`}
            >
              {c.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.catImg}
                  src={cdn(c.image, bento && i === 0 ? 1100 : 800)}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                />
              )}
              <span className={styles.catShade} aria-hidden="true" />

              <span className={styles.catBody}>
                <span className={styles.catCount}>
                  {hasProducts ? `${c.productCount} ${c.productCount === 1 ? "modelo" : "modelos"}` : "Próximamente"}
                </span>
                <span className={styles.catName}>{c.title}</span>
                {hasProducts && (
                  <span className={styles.catPrice}>
                    Desde <strong>{formatCOP(c.minPrice)}</strong>
                  </span>
                )}
                <span className={styles.catCta}>
                  Ver colección <span aria-hidden="true">→</span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
