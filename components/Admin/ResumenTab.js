import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { cdn, formatPrice } from "@/lib/format";
import { AreaChart, BarList, Sparkline } from "./Charts";
import styles from "./Admin.module.scss";

// Colores de estado: siempre van con su nombre escrito al lado
const ESTADOS = [
  { key: "APPROVED", label: "Aprobados", color: "#0ca30c" },
  { key: "PENDING", label: "Pendientes", color: "#fab219" },
  { key: "DECLINED", label: "Rechazados", color: "#d03b3b" },
  { key: "ERROR", label: "Con error", color: "#ec835a" },
  { key: "VOIDED", label: "Anulados", color: "#8a8398" },
];

const n = (v) => Number(v).toLocaleString("es-CO");

export function ResumenTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/admin/resumen").then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="form-error">{error}</div>;
  if (!data) return <div className="spinner" />;

  const ventas30 = data.serie.reduce((a, d) => a + d.ventas, 0);
  const pedidos30 = data.serie.reduce((a, d) => a + d.pedidos, 0);
  const ultimos14 = data.serie.slice(-14);

  return (
    <div className={styles.dash}>
      {/* ---------- Indicadores ---------- */}
      <section className={styles.kpis} aria-label="Indicadores principales">
        <Kpi
          icon="$"
          label="Total vendido"
          value={formatPrice(data.totalVendido)}
          hint={`${formatPrice(ventas30)} en los últimos 30 días`}
          spark={ultimos14.map((d) => d.ventas)}
          sparkLabel="Ventas de los últimos 14 días"
        />
        <Kpi
          icon="✓"
          label="Pedidos aprobados"
          value={n(data.pedidosAprobados)}
          hint={`${n(pedidos30)} en los últimos 30 días`}
          spark={ultimos14.map((d) => d.pedidos)}
          sparkLabel="Pedidos aprobados de los últimos 14 días"
        />
        <Kpi icon="◎" label="Usuarios registrados" value={n(data.usuarios)} hint={`${n(data.usuariosNuevos)} nuevos en 30 días`} />
        <Kpi
          icon="➜"
          label="Por enviar"
          value={n(data.porEnviar)}
          hint={data.porEnviar ? "Pagados y en preparación" : "Nada pendiente"}
          tone={data.porEnviar ? "warn" : ""}
          href="/admin?tab=pedidos&envio=PREPARANDO"
        />
      </section>

      {/* ---------- Ventas + estados ---------- */}
      <section className={styles.row2}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Ventas de los últimos 30 días</h2>
              <p>Pagos aprobados por día, en pesos</p>
            </div>
            <div className={styles.headStat}>
              <span>Este periodo</span>
              <strong>{formatPrice(ventas30)}</strong>
            </div>
          </div>
          <AreaChart data={data.serie} valueKey="ventas" format="cop" label="Ventas diarias de los últimos 30 días" />
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Pedidos por estado</h2>
              <p>{n(data.pedidosTotales)} pedidos en total</p>
            </div>
          </div>
          <BarList
            items={ESTADOS.map((e) => ({ label: e.label, value: data.porEstado[e.key] || 0, color: e.color })).filter(
              (e) => e.value > 0 || ["APPROVED", "PENDING", "DECLINED"].includes(ESTADOS.find((x) => x.label === e.label).key)
            )}
            format={n}
            empty="Todavía no hay pedidos"
          />
        </div>
      </section>

      {/* ---------- Productos ---------- */}
      <section className={styles.row3}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Modelos más vendidos</h2>
              <p>Por pares vendidos en pagos aprobados</p>
            </div>
          </div>
          {data.masVendidos.length === 0 ? (
            <p className="muted">Cuando se apruebe el primer pago, aquí verás el ranking.</p>
          ) : (
            <ol className={styles.ranking}>
              {data.masVendidos.map((p, i) => (
                <li key={p.id} className={`${styles.rankItem} ${i === 0 ? styles.rankFirst : ""}`}>
                  <span className={styles.rankPos}>{i + 1}</span>
                  <span className={styles.thumb}>
                    {p.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cdn(p.cover, 120)} alt="" />
                    )}
                  </span>
                  <Link href={`/producto/${p.uid}`} className={styles.rankName}>
                    {p.name}
                  </Link>
                  <span className={styles.rankUnits}>
                    {n(p.unidades)} {p.unidades === 1 ? "par" : "pares"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Ventas por categoría</h2>
              <p>Pares vendidos</p>
            </div>
          </div>
          <BarList items={data.porCategoria.map((c) => ({ label: c.categoria, value: c.unidades }))} format={(v) => `${n(v)} pares`} empty="Sin ventas aprobadas todavía" />
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Inventario</h2>
              <p>{n(data.productos)} modelos en la tienda</p>
            </div>
          </div>
          <div className={styles.invGrid}>
            <div>
              <span>Pares en stock</span>
              <strong>{n(data.stockTotal)}</strong>
            </div>
            <div>
              <span>Tallas agotadas</span>
              <strong className={data.tallasAgotadas ? styles.bad : ""}>{n(data.tallasAgotadas)}</strong>
            </div>
            <div>
              <span>Por agotarse</span>
              <strong className={data.tallasBajas ? styles.warn : ""}>{n(data.tallasBajas)}</strong>
            </div>
            <div>
              <span>Pagos pendientes</span>
              <strong>{n(data.pedidosPendientes)}</strong>
            </div>
          </div>
          <Link href="/admin?tab=stock" className={`btn btn-outline ${styles.panelLink}`} scroll={false}>
            Ver stock por talla
          </Link>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, label, value, hint, tone, spark, sparkLabel, href }) {
  const body = (
    <>
      <div className={styles.kpiTop}>
        <span className={styles.kpiIcon} aria-hidden>
          {icon}
        </span>
        <span className={styles.kpiLabel}>{label}</span>
      </div>
      <strong className={`${styles.kpiValue} ${tone ? styles[tone] : ""}`}>{value}</strong>
      {hint && <span className={styles.kpiHint}>{hint}</span>}
      {spark && <Sparkline values={spark} label={sparkLabel} />}
    </>
  );
  return href ? (
    <Link href={href} className={styles.kpi} scroll={false}>
      {body}
    </Link>
  ) : (
    <div className={styles.kpi}>{body}</div>
  );
}
