import { useWishlist } from "@/contexts/WishlistContext";
import { IconHeart } from "@/components/Icons";
import styles from "./WishlistButton.module.scss";

export function WishlistButton({ productId, variant = "floating" }) {
  const { isInWishlist, toggle } = useWishlist();
  const active = isInWishlist(productId);

  return (
    <button
      type="button"
      className={`${styles.button} ${styles[variant]} ${active ? styles.active : ""}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      aria-pressed={active}
      aria-label={active ? "Quitar de favoritos" : "Agregar a favoritos"}
      title={active ? "Quitar de favoritos" : "Agregar a favoritos"}
    >
      <IconHeart filled={active} />
      {variant === "inline" && <span>{active ? "En favoritos" : "Favoritos"}</span>}
    </button>
  );
}
