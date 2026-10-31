import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "@/lib/apiClient";
import { formatDate, formatPrice, PAYMENT_STATUS } from "@/lib/format";
import { addressLines } from "@/components/AddressCard";
import { useToast } from "@/contexts/ToastContext";
import styles from "./Admin.module.scss";

export const SHIPPING = {
  PREPARANDO: { label: "Preparando", tone: "warning" },
  ENVIADO: { label: "Enviado", tone: "muted" },
  ENTREGADO: { label: "Entregado", tone: "success" },
};

export function PedidosTab() {
  const router = useRouter();
  const { notify } = useToast();
  const estado = typeof router.query.estado === "string" ? router.query.estado : "";
  const envio = typeof router.query.envio === "string" ? router.query.envio : "";
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState("");
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    setPedidos(null);
    const qs = new URLSearchParams({ ...(estado && { estado }), ...(envio && { envio }) }).toString();
    apiFetch(`/api/admin/pedidos${qs ? `?${qs}` : ""}`)
      .then((d) => setPedidos(d.pedidos))
      .catch((e) => setError(e.message));
  }, [estado, envio]);

  const setFiltro = (key, value) => {
    const query = { ...router.query, tab: "pedidos" };
    if (value) query[key] = value;
    else delete query[key];
    router.replace({ pathname: "/admin", query }, undefined, { scroll: false });
  };

  const cambiarEnvio = async (id, shipping_status) => {
    try {
      await apiFetch("/api/admin/pedidos", { method: "PATCH", body: { id, shipping_status } });
      setPedidos((prev) => prev.map((o) => (o.id === id ? { ...o, shipping_status } : o)));
      notify(`Pedido marcado como ${SHIPPING[shipping_status].label.toLowerCase()}`, "success");
    } catch (e) {
      notify(e.message, "danger");
    }
  };

  const q = buscar.trim().toLowerCase();
  const visibles = (pedidos || []).filter(
    (o) =>
      !q ||
      o.id.toLowerCase().startsWith(q) ||
      (o.cliente?.email || "").toLowerCase().includes(q) ||
      (o.cliente?.nombre || "").toLowerCase().includes(q) ||
      (o.address_shipping?.name || "").toLowerCase().includes(q)
  );

  return (
    <div>
      <div className={styles.filters}>
        <label className="sr-only" htmlFor="f-estado">Estado del pago</label>
        <select id="f-estado" value={estado} onChange={(e) => setFiltro("estado", e.target.value)}>
          <option value="">Todos los pagos</option>
          {Object.entries(PAYMENT_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="f-envio">Estado del envío</label>
        <select id="f-envio" value={envio} onChange={(e) => setFiltro("envio", e.target.value)}>
          <option value="">Todos los envíos</option>
          {Object.entries(SHIPPING).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="f-buscar">Buscar pedido</label>
        <input
          id="f-buscar"
          type="search"
          placeholder="Buscar por cliente, correo o número"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
        {pedidos && <span className={styles.count}>{visibles.length} pedidos</span>}
      </div>

      {error && <div className="form-error">{error}</div>}
      {!pedidos && !error && <div className="spinner" />}
      {pedidos && visibles.length === 0 && <p className="muted">No hay pedidos con estos filtros.</p>}

      <div className={styles.orders}>
        {visibles.map((o) => {
          const pago = PAYMENT_STATUS[o.status_payment] || PAYMENT_STATUS.PENDING;
          const items = Array.isArray(o.products) ? o.products : [];
          const a = o.address_shipping || {};
          return (
            <article key={o.id} className={styles.order}>
              <header className={styles.orderHead}>
                <div>
                  <span className={styles.label}>Pedido</span>
                  <strong className={styles.mono}>#{o.id.slice(0, 8).toUpperCase()}</strong>
                </div>
                <div>
                  <span className={styles.label}>Fecha</span>
                  <span>{formatDate(o.created_at)}</span>
                </div>
                <div>
                  <span className={styles.label}>Cliente</span>
                  <span>{o.cliente?.nombre || a.name || "Sin nombre"}</span>
                  {o.cliente?.email && <small className="muted">{o.cliente.email}</small>}
                </div>
                <div>
                  <span className={styles.label}>Total</span>
                  <strong>{formatPrice(o.total_payment)}</strong>
                </div>
                <div className={styles.badges}>
                  <span className={`badge ${pago.tone}`}>Pago: {pago.label}</span>
                  {o.status_payment === "APPROVED" && (
                    <>
                      <label className="sr-only" htmlFor={`envio-${o.id}`}>Estado del envío</label>
                      <select
                        id={`envio-${o.id}`}
                        className={styles.shipSelect}
                        value={o.shipping_status}
                        onChange={(e) => cambiarEnvio(o.id, e.target.value)}
                      >
                        {Object.entries(SHIPPING).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </header>
              <div className={styles.orderBody}>
                <ul className={styles.items}>
                  {items.map((it, i) => (
                    <li key={`${it.product_id}-${it.size}-${i}`}>
                      <div>
                        <strong>{it.name}</strong> <span>· Talla {it.size} · x{it.quantity}</span>
                      </div>
                      <strong>{formatPrice((it.unit_price || 0) * (it.quantity || 1))}</strong>
                    </li>
                  ))}
                </ul>
                <div className={styles.address}>
                  <span className={styles.label}>Envío a</span>
                  <strong>{a.name}</strong>
                  {addressLines(a).map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                  {o.id_payment && <small className={`muted ${styles.mono}`}>Wompi: {o.id_payment}</small>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
