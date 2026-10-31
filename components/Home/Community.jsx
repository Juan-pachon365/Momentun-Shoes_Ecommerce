import styles from "./Home.module.css";
import SafeImg from "./SafeImg";
import { routes } from "./routes";

// Fotos estáticas por ahora: pon tus imágenes en /public/images/community/
const PHOTOS = [
  "/images/community/1.webp",
  "/images/community/2.webp",
  "/images/community/3.webp",
  "/images/community/4.webp",
];

export default function Community() {
  return (
    <section className={`${styles.container} ${styles.section}`}>
      <div className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>#MuéveteConMomentum</h2>
        </div>
        <a href={routes.instagram} className={styles.textLink} target="_blank" rel="noreferrer">
          Síguenos en Instagram
        </a>
      </div>
      <div className={styles.communityGrid}>
        {PHOTOS.map((src) => (
          <div key={src} className={styles.communityItem}>
            <SafeImg
              src={src}
              alt="Cliente de Momentum Shoes"
              loading="lazy"
                />
          </div>
        ))}
      </div>
    </section>
  );
}
