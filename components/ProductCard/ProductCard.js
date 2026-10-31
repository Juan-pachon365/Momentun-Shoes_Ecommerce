import Link from "next/link";
import { cdn, totalStock } from "@/lib/format";
import { Price } from "@/components/Price";
import { WishlistButton } from "@/components/WishlistButton";
import styles from "./ProductCard.module.scss";

export function ProductCard({ product }) {
  const stock = totalStock(product);
  const soldOut = product.product_sizes && stock === 0;
  const discount = Number(product.discount) || 0;

  return (
    <Link href={`/producto/${product.uid}`} className={styles.card}>
      <div className={styles.media}>
        {product.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cdn(product.cover, 600)} alt={product.name} loading="lazy" />
        ) : (
          <div className={styles.noImage}>Sin imagen</div>
        )}
        <div className={styles.tags}>
          {discount > 0 && <span className={styles.tagSale}>-{discount}%</span>}
          {soldOut && <span className={styles.tagOut}>Agotado</span>}
        </div>
        <div className={styles.wish}>
          <WishlistButton productId={product.id} />
        </div>
      </div>
      <div className={styles.body}>
        <span className={styles.meta}>
          {[product.brand?.name, product.category?.title].filter(Boolean).join(" · ")}
        </span>
        <h3 className={styles.name}>{product.name.trim()}</h3>
        <Price price={product.price} discount={discount} size="sm" />
      </div>
    </Link>
  );
}
