import Link from "next/link";
import { IconShield, IconTruck, IconBox } from "@/components/Icons";
import styles from "./Footer.module.scss";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.perks}`}>
        <div>
          <IconTruck />
          <div>
            <strong>Envío gratis</strong>
            <span>A toda Colombia</span>
          </div>
        </div>
        <div>
          <IconShield />
          <div>
            <strong>Pago seguro</strong>
            <span>Tarjeta, PSE y Nequi con Wompi</span>
          </div>
        </div>
        <div>
          <IconBox />
          <div>
            <strong>Stock real</strong>
            <span>Disponibilidad por talla</span>
          </div>
        </div>
      </div>
      <div className={`container ${styles.bottom}`}>
        <Link href="/" className={styles.logo}>
          MOMENTUM<span>SHOES</span>
        </Link>
        <nav className={styles.links} aria-label="Pie de página">
          <Link href="/catalogo">Catálogo</Link>
          <Link href="/favoritos">Favoritos</Link>
          <Link href="/carrito">Carrito</Link>
          <Link href="/cuenta">Mi cuenta</Link>
        </nav>
        <p className={styles.copy}>© {new Date().getFullYear()} Momentum Shoes. Bogotá, Colombia.</p>
      </div>
    </footer>
  );
}
