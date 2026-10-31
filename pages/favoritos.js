import { useEffect, useState } from "react";
import { getProductsByIds } from "@/lib/catalog";
import { useWishlist } from "@/contexts/WishlistContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Seo } from "@/components/Seo";
import { ProductGrid } from "@/components/ProductGrid";
import { EmptyState } from "@/components/EmptyState";
import { IconHeart } from "@/components/Icons";

export default function Favoritos() {
  const { loading: authLoading } = useRequireAuth();
  const { ids } = useWishlist();
  const [products, setProducts] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    getProductsByIds(ids)
      .then((data) => {
        if (!active) return;
        // Mantener el orden de la lista (el más reciente primero)
        const byId = Object.fromEntries(data.map((p) => [p.id, p]));
        setProducts(ids.map((id) => byId[id]).filter(Boolean));
      })
      .catch(() => active && setProducts([]));
    return () => {
      active = false;
    };
  }, [ids, authLoading]);

  return (
    <div className="container page">
      <Seo title="Favoritos" />
      <h1 className="page-title">Favoritos</h1>
      <p className="page-subtitle">Los zapatos que guardaste para después.</p>

      {authLoading || products === null ? (
        <div className="spinner" />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<IconHeart />}
          title="Aún no tienes favoritos"
          text="Toca el corazón de cualquier producto para guardarlo aquí."
          actionHref="/catalogo"
          actionLabel="Explorar catálogo"
        />
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
