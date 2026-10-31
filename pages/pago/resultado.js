import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/format";
import { Seo } from "@/components/Seo";
import { IconBox, IconCheck, IconClose } from "@/components/Icons";
import styles from "@/styles/Result.module.scss";

const MESSAGES = {
  APPROVED: {
    title: "¡Pago aprobado!",
    text: "Tu pedido fue confirmado. Te avisaremos cuando salga para entrega.",
    tone: "success",
  },
  PENDING: {
    title: "Pago en proceso",
    text: "Wompi todavía está confirmando tu pago. Esto puede tardar unos minutos; el estado se actualizará en Mis pedidos.",
    tone: "warning",
  },
  DECLINED: {
    title: "Pago rechazado",
    text: "Tu entidad financiera rechazó el pago. Puedes intentarlo de nuevo con otro medio de pago.",
    tone: "danger",
  },
  VOIDED: { title: "Pago anulado", text: "La transacción fue anulada.", tone: "danger" },
  ERROR: {
    title: "Ocurrió un error",
    text: "No se pudo completar el pago. No se realizó ningún cobro; intenta de nuevo.",
    tone: "danger",
  },
};

export default function ResultadoPago() {
  const router = useRouter();
  const { clearCart } = useCart();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    if (!router.isReady) return;
    const id = router.query.id;
    if (!id) {
      setState({ loading: false, error: "No recibimos información de la transacción." });
      return;
    }

    let attempts = 0;
    let timer;
    const check = async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/wompi/verify?id=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setState({ loading: false, ...data, transactionId: id });
        if (data.status === "APPROVED") clearCart();
        // Mientras siga pendiente, volver a consultar (máx. ~1 minuto)
        if (data.status === "PENDING" && attempts < 12) timer = setTimeout(check, 5000);
      } catch (err) {
        setState({ loading: false, error: err.message || "No se pudo verificar el pago" });
      }
    };
    check();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.id]);

  const info = MESSAGES[state.status];

  return (
    <div className={`container page ${styles.wrap}`}>
      <Seo title="Resultado del pago" />
      <div className={`card ${styles.box}`}>
        {state.loading ? (
          <>
            <div className="spinner" />
            <p className="muted">Verificando tu pago con Wompi...</p>
          </>
        ) : state.error ? (
          <>
            <div className={`${styles.icon} ${styles.danger}`}>
              <IconClose />
            </div>
            <h1>No pudimos verificar el pago</h1>
            <p className="muted">{state.error}</p>
            <div className={styles.actions}>
              <Link href="/cuenta?tab=pedidos" className="btn btn-primary">
                Ver mis pedidos
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className={`${styles.icon} ${styles[info?.tone || "warning"]}`}>
              {state.status === "APPROVED" ? <IconCheck /> : state.status === "PENDING" ? <IconBox /> : <IconClose />}
            </div>
            <h1>{info?.title || state.status}</h1>
            <p className="muted">{info?.text}</p>

            <dl className={styles.details}>
              <div>
                <dt>Pedido</dt>
                <dd>#{String(state.reference || "").slice(0, 8).toUpperCase()}</dd>
              </div>
              <div>
                <dt>Valor</dt>
                <dd>{formatPrice((state.amountInCents || 0) / 100)}</dd>
              </div>
              {state.paymentMethod && (
                <div>
                  <dt>Medio de pago</dt>
                  <dd>{state.paymentMethod}</dd>
                </div>
              )}
              <div>
                <dt>Transacción</dt>
                <dd>{state.transactionId}</dd>
              </div>
            </dl>

            <div className={styles.actions}>
              {state.status === "APPROVED" || state.status === "PENDING" ? (
                <Link href="/cuenta?tab=pedidos" className="btn btn-primary">
                  Ver mis pedidos
                </Link>
              ) : (
                <Link href="/carrito" className="btn btn-primary">
                  Volver al carrito
                </Link>
              )}
              <Link href="/catalogo" className="btn btn-outline">
                Seguir comprando
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
