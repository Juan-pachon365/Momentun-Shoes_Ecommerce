import Link from "next/link";
import styles from "./Home.module.css";
import { routes } from "./routes";
import { cdn } from "@/lib/format";

// Solo se usan logos con transparencia real (PNG, WebP o SVG).
// Un .jpg no tiene transparencia: en ese caso se muestra el nombre de la marca.
const logoUsable = (url) => typeof url === "string" && /\.(png|webp|svg)(\?|$)/i.test(url);

// Cinta de marcas en movimiento hacia la derecha. Se repite para que el ciclo no tenga cortes.
export default function BrandStrip({ brands }) {
  if (!brands?.length) return null;

  const repeticiones = Math.max(2, Math.ceil(12 / brands.length));
  const fila = Array.from({ length: repeticiones }, () => brands).flat();

  const Grupo = ({ oculto }) => (
    <ul className={styles.marqueeGroup} aria-hidden={oculto || undefined}>
      {fila.map((b, i) => {
        const conLogo = logoUsable(b.logo);
        return (
          <li key={`${b.id}-${i}`}>
            <Link
              href={routes.brand(b.slug)}
              className={conLogo ? styles.brandLogoItem : i % 2 === 0 ? styles.brandSolid : styles.brandOutline}
              tabIndex={oculto ? -1 : undefined}
              aria-label={conLogo ? b.name : undefined}
              title={b.name}
            >
              {conLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cdn(b.logo, 360)} alt={oculto ? "" : b.name} loading="lazy" />
              ) : (
                b.name
              )}
            </Link>
            <span className={styles.brandSep} aria-hidden="true">
              ◆
            </span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section className={styles.brandStrip} aria-label="Marcas disponibles">
      <div className={styles.marquee}>
        <div className={styles.marqueeTrack}>
          <Grupo />
          <Grupo oculto />
        </div>
      </div>
    </section>
  );
}
