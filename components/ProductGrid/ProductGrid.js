import { ProductCard } from "@/components/ProductCard";
import styles from "./ProductGrid.module.scss";

export function ProductGrid({ products }) {
  return (
    <div className={styles.grid}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
