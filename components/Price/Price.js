import { finalPrice, formatPrice } from "@/lib/format";
import styles from "./Price.module.scss";

export function Price({ price, discount = 0, size = "md" }) {
  const hasDiscount = Number(discount) > 0;
  return (
    <div className={`${styles.price} ${styles[size]}`}>
      <span className={styles.final}>{formatPrice(finalPrice(price, discount))}</span>
      {hasDiscount && (
        <>
          <span className={styles.original}>{formatPrice(price)}</span>
          <span className={styles.off}>-{Number(discount)}%</span>
        </>
      )}
    </div>
  );
}
