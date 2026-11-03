import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { anton, archivo } from "@/components/Home/fonts";
import styles from "./AdminShell.module.scss";

const ic = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const Icons = {
  resumen: (
    <svg {...ic}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
  ),
  pedidos: (
    <svg {...ic}><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></svg>
  ),
  stock: (
    <svg {...ic}><path d="M3 17c0-1 1-2 3-2l3-1 3-5h3l1 3c2 1 5 1 5 3v2H3z" /><path d="M3 19h18" /></svg>
  ),
  zapato: (
    <svg {...ic}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
  ),
  ayuda: (
    <svg {...ic}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.6-.8 1.1v.5M12 16h.01" /></svg>
  ),
  tienda: (
    <svg {...ic}><path d="M4 9l1.5-5h13L20 9" /><path d="M4 9h16v11H4z" /><path d="M9 20v-6h6v6" /></svg>
  ),
  salir: (
    <svg {...ic}><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg>
  ),
  menu: (
    <svg {...ic}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  ),
  cerrar: (
    <svg {...ic}><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
};

export const ADMIN_SECTIONS = [
  { id: "resumen", label: "Resumen", title: "Resumen general" },
  { id: "pedidos", label: "Pedidos", title: "Pedidos" },
  { id: "stock", label: "Zapatos y stock", title: "Zapatos y stock" },
  { id: "zapato", label: "Nuevo zapato", title: "Nuevo zapato" },
  { id: "ayuda", label: "Chat y contacto", title: "Chat de ayuda y contacto" },
];

export function AdminShell({ active, title, children }) {
  const router = useRouter();
  const { profile, user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [router.asPath]);

  const nombre = [profile?.firstname, profile?.lastname].filter(Boolean).join(" ") || user?.email || "";
  const inicial = (profile?.firstname || user?.email || "A").charAt(0).toUpperCase();

  const salir = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className={`${styles.shell} ${anton.variable} ${archivo.variable}`}>
      <aside className={`${styles.side} ${open ? styles.sideOpen : ""}`} aria-label="Menú del panel">
        <div className={styles.brand}>
          <Link href="/admin" className={styles.logo}>
            MOMENTUM<span>ADMIN</span>
          </Link>
          <button className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Cerrar menú">
            {Icons.cerrar}
          </button>
        </div>

        <span className={styles.group}>Panel</span>
        <nav className={styles.nav}>
          {ADMIN_SECTIONS.map((s) => (
            <Link
              key={s.id}
              href={`/admin?tab=${s.id}`}
              className={`${styles.navItem} ${active === s.id ? styles.navActive : ""}`}
              aria-current={active === s.id ? "page" : undefined}
              scroll={false}
            >
              {Icons[s.id]}
              <span>{s.id === "zapato" && router.query.editar ? "Editar zapato" : s.label}</span>
            </Link>
          ))}
        </nav>

        <span className={styles.group}>Tienda</span>
        <nav className={styles.nav}>
          <Link href="/" className={styles.navItem}>
            {Icons.tienda}
            <span>Ver tienda</span>
          </Link>
          <button className={styles.navItem} onClick={salir}>
            {Icons.salir}
            <span>Cerrar sesión</span>
          </button>
        </nav>

        <div className={styles.sideFoot}>
          <span className={styles.avatar}>{inicial}</span>
          <div>
            <strong>{nombre}</strong>
            <small>Administrador</small>
          </div>
        </div>
      </aside>
      {open && <div className={styles.backdrop} onClick={() => setOpen(false)} />}

      <div className={styles.main}>
        <header className={styles.top}>
          <button className={styles.menuBtn} onClick={() => setOpen(true)} aria-label="Abrir menú">
            {Icons.menu}
          </button>
          <div className={styles.topTitle}>
            <span>Momentum Shoes</span>
            <h1>{title}</h1>
          </div>
          <div className={styles.topUser}>
            <span className={styles.avatar}>{inicial}</span>
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
