import { Seo } from "@/components/Seo";
import { EmptyState } from "@/components/EmptyState";
import { IconSearch } from "@/components/Icons";

export default function NotFound() {
  return (
    <div className="container page">
      <Seo title="Página no encontrada" />
      <EmptyState
        icon={<IconSearch />}
        title="Esta página no existe"
        text="Puede que el producto ya no esté disponible o que el enlace esté mal escrito."
        actionHref="/catalogo"
        actionLabel="Ir al catálogo"
      />
    </div>
  );
}
