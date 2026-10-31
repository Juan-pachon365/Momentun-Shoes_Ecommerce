import Link from "next/link";
import styles from "./Home.module.css";
import SafeImg from "./SafeImg";
import { routes } from "./routes";

// `image` = tu imagen cristalizada con los zapatos volando (ponla en /public/images).
// Si no hay imagen, se ven los cristales en SVG como respaldo.
export default function HomeHero({ image }) {
  return (
    <section className={styles.hero}>
      <Shards />
      {image && (
        <SafeImg
          className={styles.heroImage}
          src={image}
          alt=""
          aria-hidden="true"
        />
      )}
      <div className={styles.heroOverlay} aria-hidden="true" />

      <div className={`${styles.container} ${styles.heroContent}`}>
        <span className={styles.badge}>NUEVA COLECCIÓN</span>
        <h1 className={styles.heroTitle}>
          El impulso
          <br />
          <span className={styles.heroAccent}>que necesitas</span>
        </h1>
        <p className={styles.heroText}>
          Nike, Adidas, Puma y más. Tallas de la 27 a la 42, para toda la familia.
        </p>
        <div className={styles.heroActions}>
          <Link href={routes.allProducts} className={styles.btnLight}>
            Comprar ahora
          </Link>
          <Link href={routes.allProducts} className={styles.btnOutline}>
            Ver colección
          </Link>
        </div>
      </div>
    </section>
  );
}

function Shards() {
  return (
    <svg
      className={styles.heroShards}
      viewBox="0 0 1440 680"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <polygon points="0,0 380,0 210,260" fill="#4C4463" opacity="0.55" />
      <polygon points="0,680 0,380 260,560" fill="#5D4896" opacity="0.45" />
      <polygon points="260,560 0,680 420,680" fill="#4C4463" opacity="0.6" />
      <polygon points="1440,0 1080,0 1300,220" fill="#5F38C9" opacity="0.5" />
      <polygon points="1440,0 1300,220 1440,360" fill="#4C4463" opacity="0.7" />
      <polygon points="1440,680 1100,680 1440,420" fill="#5D4896" opacity="0.5" />
      <polygon points="760,90 900,20 860,200" fill="#5414FD" opacity="0.55" />
      <polygon points="1180,420 1260,330 1290,520" fill="#5F38C9" opacity="0.55" />
      <polygon points="640,560 720,470 760,640" fill="#5D4896" opacity="0.5" />
      <polygon points="980,300 1040,250 1030,360" fill="#A98BFF" opacity="0.35" />
      <polygon points="1340,560 1380,500 1400,600" fill="#A98BFF" opacity="0.35" />
      <line x1="720" y1="340" x2="1100" y2="180" stroke="#7B5CFF" strokeWidth="2" opacity="0.35" />
    </svg>
  );
}
