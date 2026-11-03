import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Seo } from "@/components/Seo";
import { AdminShell, ADMIN_SECTIONS } from "@/components/Admin/AdminShell";
import { ResumenTab, PedidosTab, StockTab, ProductoForm, SoporteTab } from "@/components/Admin";
import styles from "@/components/Admin/Admin.module.scss";

export default function Admin() {
  const router = useRouter();
  const { loading } = useRequireAuth();
  const { profile, isAdmin } = useAuth();
  const tab = ADMIN_SECTIONS.some((t) => t.id === router.query.tab) ? router.query.tab : "resumen";
  const editar = typeof router.query.editar === "string" ? router.query.editar : "";

  if (loading || !profile) {
    return (
      <div className={styles.fullScreen}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={styles.fullScreen}>
        <Seo title="Administración" />
        <div className={styles.denied}>
          <h1>Sin acceso</h1>
          <p>Esta sección es solo para administradores de la tienda.</p>
          <Link href="/" className="btn btn-primary">
            Volver a la tienda
          </Link>
        </div>
      </div>
    );
  }

  const seccion = ADMIN_SECTIONS.find((s) => s.id === tab);
  const titulo = tab === "zapato" && editar ? "Editar zapato" : seccion.title;

  return (
    <AdminShell active={tab} title={titulo}>
      <Seo title={`${titulo} · Admin`} />
      {tab === "resumen" && <ResumenTab />}
      {tab === "pedidos" && <PedidosTab />}
      {tab === "stock" && <StockTab />}
      {tab === "zapato" && <ProductoForm editarUid={editar} />}
      {tab === "ayuda" && <SoporteTab />}
    </AdminShell>
  );
}
