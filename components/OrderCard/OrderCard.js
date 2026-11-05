import Link from "next/link";
import { cdn, formatDate, formatPrice, PAYMENT_STATUS, urlRastreo } from "@/lib/format";
import { addressLines } from "@/components/AddressCard";
import styles from "./OrderCard.module.scss";

const SHIPPING = {
  PREPARANDO: { label: "Preparando envío", tone: "warning" },
  ENVIADO: { label: "Enviado", tone: "muted" },
  ENTREGADO: { label: "Entregado", tone: "success" },
};

export function OrderCard({ order }) {
  const status = PAYMENT_STATUS[order.status_payment] || PAYMENT_STATUS.PENDING;
  const items = Array.isArray(order.products) ? order.products : [];
  const address = order.address_shipping || {};

  return (
    <article className={styles.order}>
      <header className={styles.head}>
        <div>
          <span className={styles.label}>Pedido</span>
          <strong className={styles.ref}>#{order.id.slice(0, 8).toUpperCase()}</strong>
        </div>
        <div>
          <span className={styles.label}>Fecha</span>
          <span>{formatDate(order.created_at)}</span>
        </div>
        <div>
          <span className={styles.label}>Total</span>
          <strong>{formatPrice(order.total_payment)}</strong>
        </div>
        <div className={styles.badges}>
          <span className={`badge ${status.tone}`}>{status.label}</span>
          {order.status_payment === "APPROVED" && SHIPPING[order.shipping_status] && (
            <span className={`badge ${SHIPPING[order.shipping_status].tone}`}>{SHIPPING[order.shipping_status].label}</span>
          )}
        </div>
      </header>

      <ul className={styles.items}>
        {items.map((item, i) => (
          <li key={`${item.product_id}-${item.size}-${i}`}>
            <Link href={item.uid ? `/producto/${item.uid}` : "#"} className={styles.thumb}>
              {item.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cdn(item.cover, 160)} alt="" />
              )}
            </Link>
            <div className={styles.itemInfo}>
              <strong>{item.name}</strong>
              <span>
                Talla {item.size} · Cantidad {item.quantity}
              </span>
            </div>
            <span className={styles.itemPrice}>{formatPrice((item.unit_price || 0) * (item.quantity || 1))}</span>
          </li>
        ))}
      </ul>

      {address.address && (
        <footer className={styles.address}>
          <span className={styles.label}>Envío a</span>
          <span>
            {address.name} · {addressLines(address).join(" · ")}
          </span>
          {order.shipping_carrier && (
            <span className={styles.carrier}>
              {order.shipping_carrier} · envío {formatPrice(order.shipping_cost)}
              {order.tracking_number ? (
                <>
                  {" · "}Guía <b>{order.tracking_number}</b>{" "}
                  <a href={urlRastreo(order.tracking_number)} target="_blank" rel="noopener noreferrer">
                    Rastrear pedido
                  </a>
                </>
              ) : (
                order.status_payment === "APPROVED" && " · Te avisaremos el número de guía cuando lo despachemos"
              )}
            </span>
          )}
        </footer>
      )}
    </article>
  );
}
