import Link from "next/link";
import { cdn, totalStock } from "@/lib/format";
import { Price } from "@/components/Price";
import { WishlistButton } from "@/components/WishlistButton";
import styles from "./CatalogCard.module.scss";

const DIAS_NUEVO = 30;

// Tarjeta del catálogo al estilo de las grandes marcas: foto protagonista,
// segunda foto al pasar el mouse y poca información debajo.
export function CatalogCard({ product, priority = false }) {
  const stock = totalStock(product);
  const agotado = stock === 0;
  const descuento = Number(product.discount) || 0;
  const tallas = (product.product_sizes || []).filter((s) => s.stock > 0).map((s) => s.numero).sort((a, b) => a - b);
  const segunda = (product.image_gallery || []).find((u) => u && u !== product.cover);
  const esNuevo = product.created_at && Date.now() - new Date(product.created_at).getTime() < DIAS_NUEVO * 86400000;

  const etiqueta = agotado
    ? "Agotado"
    : descuento > 0
    ? "Oferta"
    : stock <= 6
    ? "Últimas tallas"
    : esNuevo
    ? "Nuevo"
    : null;

  const rangoTallas = tallas.length ? (tallas.length === 1 ? `Talla ${tallas[0]}` : `Tallas ${tallas[0]} – ${tallas[tallas.length - 1]}`) : "Sin tallas disponibles";

  return (
    <Link href={`/producto/${product.uid}`} className={`${styles.card} ${agotado ? styles.soldOut : ""}`}>
      <div className={styles.media}>
        {product.cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.imgMain} src={cdn(product.cover, 700)} alt={product.name} loading={priority ? "eager" : "lazy"} />
            {segunda && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.imgAlt} src={cdn(segunda, 700)} alt="" aria-hidden="true" loading="lazy" />
            )}
          </>
        ) : (
          <span className={styles.noImage}>Sin imagen</span>
        )}
        {descuento > 0 && <span className={styles.discount}>-{descuento}%</span>}
        <span className={styles.wish}>
          <WishlistButton productId={product.id} />
        </span>
        <span className={styles.sizesHover} aria-hidden="true">
          {tallas.slice(0, 8).map((t) => (
            <span key={t}>{t}</span>
          ))}
          {tallas.length > 8 && <span>+{tallas.length - 8}</span>}
        </span>
      </div>

      <div className={styles.info}>
        {etiqueta && <span className={`${styles.tag} ${agotado ? styles.tagMuted : ""}`}>{etiqueta}</span>}
        <h3 className={styles.name}>{product.name.trim()}</h3>
        <span className={styles.meta}>{[product.category?.title, product.brand?.name].filter(Boolean).join(" · ")}</span>
        <span className={styles.meta}>{rangoTallas}</span>
        <div className={styles.price}>
          <Price price={product.price} discount={descuento} size="sm" />
        </div>
      </div>
    </Link>
  );
}
