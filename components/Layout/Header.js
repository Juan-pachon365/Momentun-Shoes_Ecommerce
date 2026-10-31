import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { getCategories } from "@/lib/catalog";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { IconBag, IconClose, IconHeart, IconMenu, IconSearch, IconUser } from "@/components/Icons";
import styles from "./Header.module.scss";

export function Header() {
  const router = useRouter();
  const { user, profile, isAdmin } = useAuth();
  const { count: cartCount, ready } = useCart();
  const { count: wishCount } = useWishlist();
  const [categories, setCategories] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearch(typeof router.query.q === "string" ? router.query.q : "");
  }, [router.asPath, router.query.q]);

  const onSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/catalogo?q=${encodeURIComponent(q)}` : "/catalogo");
  };

  const isActive = (href) => {
    const current = router.asPath.split("#")[0];
    return current === href;
  };

  const firstName = profile?.firstname || user?.user_metadata?.firstname;

  return (
    <header className={styles.header}>
      <div className={styles.announce}>
        Envío gratis a toda Colombia · Paga seguro con Wompi
      </div>
      <div className={`container ${styles.bar}`}>
        <button
          className={styles.menuToggle}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <IconClose /> : <IconMenu />}
        </button>

        <Link href="/" className={styles.logo} aria-label="Momentum Shoes, inicio">
          MOMENTUM<span>SHOES</span>
        </Link>

        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`} aria-label="Principal">
          <form className={styles.mobileSearch} onSubmit={onSearch} role="search">
            <IconSearch />
            <input
              type="search"
              placeholder="Buscar zapatos"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar zapatos"
            />
          </form>
          {isAdmin && (
            <Link href="/admin" className={styles.navAdmin}>
              Panel de administración
            </Link>
          )}
          <Link href="/catalogo" className={isActive("/catalogo") ? styles.active : ""}>
            Catálogo
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/catalogo?categoria=${c.slug}`}
              className={isActive(`/catalogo?categoria=${c.slug}`) ? styles.active : ""}
            >
              {c.title}
            </Link>
          ))}
        </nav>

        <form className={styles.search} onSubmit={onSearch} role="search">
          <IconSearch />
          <input
            type="search"
            placeholder="Buscar zapatos"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar zapatos"
          />
        </form>

        <div className={styles.actions}>
          {isAdmin && (
            <Link href="/admin" className={styles.adminLink}>
              Admin
            </Link>
          )}
          <Link href="/favoritos" className={styles.iconLink} aria-label={`Favoritos (${wishCount})`}>
            <IconHeart />
            {wishCount > 0 && <span className={styles.count}>{wishCount}</span>}
          </Link>
          <Link href="/carrito" className={styles.iconLink} aria-label={`Carrito (${cartCount})`}>
            <IconBag />
            {ready && cartCount > 0 && <span className={styles.count}>{cartCount}</span>}
          </Link>
          <Link href={user ? "/cuenta" : "/ingresar"} className={styles.account}>
            <IconUser />
            <span className={styles.accountLabel}>{user ? firstName || "Mi cuenta" : "Ingresar"}</span>
          </Link>
        </div>
      </div>
      {menuOpen && <div className={styles.backdrop} onClick={() => setMenuOpen(false)} />}
    </header>
  );
}
