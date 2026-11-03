import { useEffect, useState } from "react";
import Link from "next/link";
import { getProductsByIds } from "@/lib/catalog";
import { cdn, finalPrice, formatPrice } from "@/lib/format";
import { apiFetch } from "@/lib/apiClient";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useAddresses } from "@/hooks/useAddresses";
import { Seo } from "@/components/Seo";
import { AyudaPedido } from "@/components/Soporte";
import { EmptyState } from "@/components/EmptyState";
import { AddressCard } from "@/components/AddressCard";
import { AddressForm } from "@/components/AddressForm";
import { IconBag, IconMinus, IconPlus, IconShield, IconTrash } from "@/components/Icons";
import styles from "@/styles/Cart.module.scss";

export default function Carrito() {
  const { items, ready, updateQuantity, removeItem, syncWithCatalog, count, subtotal, total, savings } = useCart();
  const { user, loading: authLoading } = useAuth();
  const { notify } = useToast();
  const [synced, setSynced] = useState(false);

  // Al abrir el carrito, actualizar precios y stock desde Supabase
  useEffect(() => {
    if (!ready || synced) return;
    const ids = [...new Set(items.map((i) => i.productId))];
    if (ids.length === 0) {
      setSynced(true);
      return;
    }
    getProductsByIds(ids)
      .then((products) => {
        const changed = syncWithCatalog(products);
        if (changed) notify("Actualizamos tu carrito con los precios y existencias actuales");
      })
      .catch(() => {})
      .finally(() => setSynced(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) {
    return (
      <div className="container page">
        <div className="spinner" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container page">
        <Seo title="Carrito" />
        <h1 className="page-title">Carrito</h1>
        <EmptyState
          icon={<IconBag />}
          title="Tu carrito está vacío"
          text="Explora el catálogo y agrega tus zapatos favoritos."
          actionHref="/catalogo"
          actionLabel="Ir al catálogo"
        />
      </div>
    );
  }

  return (
    <div className="container page">
      <Seo title="Carrito" />
      <h1 className="page-title">Carrito</h1>
      <p className="page-subtitle">
        {count} {count === 1 ? "producto" : "productos"}
      </p>

      <div className={styles.layout}>
        <div className={styles.left}>
          <ul className={styles.items}>
            {items.map((item) => {
              const unit = finalPrice(item.price, item.discount);
              return (
                <li key={item.key} className={styles.item}>
                  <Link href={`/producto/${item.uid}`} className={styles.thumb}>
                    {item.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cdn(item.cover, 240)} alt={item.name} />
                    )}
                  </Link>
                  <div className={styles.itemInfo}>
                    <Link href={`/producto/${item.uid}`} className={styles.itemName}>
                      {item.name.trim()}
                    </Link>
                    <span className={styles.itemMeta}>Talla {item.size}</span>
                    <span className={styles.itemUnit}>
                      {formatPrice(unit)}
                      {item.discount > 0 && <s>{formatPrice(item.price)}</s>}
                    </span>
                    <div className={styles.itemControls}>
                      <div className={styles.qty}>
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Disminuir cantidad"
                        >
                          <IconMinus />
                        </button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          disabled={item.stock && item.quantity >= item.stock}
                          aria-label="Aumentar cantidad"
                        >
                          <IconPlus />
                        </button>
                      </div>
                      <button className={styles.remove} onClick={() => removeItem(item.key)} aria-label={`Quitar ${item.name}`}>
                        <IconTrash />
                      </button>
                    </div>
                    {item.stock > 0 && item.quantity >= item.stock && (
                      <span className={styles.stockNote}>Máximo disponible: {item.stock}</span>
                    )}
                  </div>
                  <strong className={styles.itemTotal}>{formatPrice(unit * item.quantity)}</strong>
                </li>
              );
            })}
          </ul>

          <div className={styles.shipping}>
            <h2>Dirección de envío</h2>
            {authLoading ? (
              <div className="spinner" />
            ) : user ? (
              <ShippingSelector />
            ) : (
              <div className={styles.loginBox}>
                <p>Ingresa a tu cuenta para elegir la dirección de envío y pagar.</p>
                <div className={styles.loginActions}>
                  <Link href="/ingresar?next=/carrito" className="btn btn-primary">
                    Ingresar
                  </Link>
                  <Link href="/registro?next=/carrito" className="btn btn-outline">
                    Crear cuenta
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className={styles.summary}>
          <h2>Resumen</h2>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
            {savings > 0 && (
              <div className={styles.savings}>
                <dt>Descuentos</dt>
                <dd>-{formatPrice(savings)}</dd>
              </div>
            )}
            <div>
              <dt>Envío</dt>
              <dd className={styles.free}>Gratis</dd>
            </div>
            <div className={styles.total}>
              <dt>Total</dt>
              <dd>{formatPrice(total)}</dd>
            </div>
          </dl>
          <CheckoutButton disabled={!synced} />
          <p className={styles.secure}>
            <IconShield /> Pago procesado por Wompi (Bancolombia). Tarjeta, PSE, Nequi y más.
          </p>
          <AyudaPedido
            resumen={items.map((i) => `• ${i.name} · talla ${i.size} · x${i.quantity}`).join("\n")}
          />
        </aside>
      </div>
    </div>
  );
}

/* ---------- Selección de dirección (comparte estado vía sessionStorage-free contexto simple) ---------- */

let selectedAddressId = null;
const listeners = new Set();
const setSelectedAddress = (id) => {
  selectedAddressId = id;
  listeners.forEach((fn) => fn(id));
};
function useSelectedAddress() {
  const [id, setId] = useState(selectedAddressId);
  useEffect(() => {
    listeners.add(setId);
    return () => listeners.delete(setId);
  }, []);
  return id;
}

function ShippingSelector() {
  const { addresses, loading, save } = useAddresses();
  const selected = useSelectedAddress();
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (addresses.length === 0) {
      setAdding(true);
      setSelectedAddress(null);
    } else if (!addresses.some((a) => a.id === selected)) {
      setSelectedAddress(addresses[0].id);
    }
  }, [loading, addresses, selected]);

  if (loading) return <div className="spinner" />;

  if (adding) {
    return (
      <div className={styles.addressFormBox}>
        <AddressForm
          submitLabel="Usar esta dirección"
          onCancel={addresses.length > 0 ? () => setAdding(false) : undefined}
          onSubmit={async (values) => {
            const created = await save(values);
            setSelectedAddress(created.id);
            setAdding(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.addresses}>
      {addresses.map((a) => (
        <AddressCard key={a.id} address={a} selected={selected === a.id} onSelect={() => setSelectedAddress(a.id)} />
      ))}
      <button className={styles.addAddress} onClick={() => setAdding(true)}>
        <IconPlus /> Nueva dirección
      </button>
    </div>
  );
}

function CheckoutButton({ disabled }) {
  const { items } = useCart();
  const { user } = useAuth();
  const addressId = useSelectedAddress();
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  if (!user) {
    return (
      <Link href="/ingresar?next=/carrito" className="btn btn-primary btn-block">
        Ingresa para pagar
      </Link>
    );
  }

  const pay = async () => {
    setError("");
    if (!addressId) {
      setError("Agrega o selecciona una dirección de envío");
      return;
    }
    setSending(true);
    try {
      const { url } = await apiFetch("/api/checkout", {
        method: "POST",
        body: {
          addressId,
          items: items.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
        },
      });
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <>
      {error && <div className="form-error">{error}</div>}
      <button className="btn btn-primary btn-block" onClick={pay} disabled={disabled || sending}>
        {sending ? "Redirigiendo a Wompi..." : "Pagar con Wompi"}
      </button>
    </>
  );
}
