import Link from "next/link";
import styles from "./Home.module.css";
import { routes } from "./routes";

export default function SizeFinder({ sizes }) {
  const { kids = [], adults = [] } = sizes ?? {};
  if (!kids.length && !adults.length) return null;

  return (
    <section className={`${styles.container} ${styles.sectionTight}`}>
      <div className={styles.sizeBand}>
        <div className={styles.sizeIntro}>
          <h2 className={styles.sizeTitle}>Busca por tu talla</h2>
          <p>Solo te mostramos lo que hay disponible en tu número.</p>
        </div>
        <div className={styles.sizeGroups}>
          {kids.length > 0 && <SizeGroup label="NIÑOS" sizes={kids} />}
          {adults.length > 0 && <SizeGroup label="ADULTOS" sizes={adults} />}
        </div>
      </div>
    </section>
  );
}

function SizeGroup({ label, sizes }) {
  return (
    <div>
      <span className={styles.sizeLabel}>{label}</span>
      <div className={styles.sizeChips}>
        {sizes.map((n) => (
          <Link key={n} href={routes.size(n)} className={styles.sizeChip}>
            {n}
          </Link>
        ))}
      </div>
    </div>
  );
}
