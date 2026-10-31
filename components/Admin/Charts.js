import { useEffect, useId, useRef, useState } from "react";
import styles from "./Charts.module.scss";

// Mide el ancho del contenedor para dibujar el SVG a su tamaño real
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

// Escala "bonita" para el eje Y: 4 marcas redondas que cubren el máximo
function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1, 2, 3, 4].map((x) => x * 25000);
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw);
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  return ticks;
}

function monotonePath(pts) {
  const n = pts.length;
  if (n < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
  const dx = [], dy = [], m = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    dy.push(pts[i + 1][1] - pts[i][1]);
    m.push(dy[i] / dx[i]);
  }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const c = dx[i] / 3;
    d += `C${(pts[i][0] + c).toFixed(1)},${(pts[i][1] + t[i] * c).toFixed(1)} ${(pts[i + 1][0] - c).toFixed(1)},${(pts[i + 1][1] - t[i + 1] * c).toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}

const compactCOP = (v) =>
  v >= 1e6 ? `$${(v / 1e6).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M` : v >= 1e3 ? `$${Math.round(v / 1e3)} mil` : `$${v}`;

const fechaCorta = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
};

/** Área + línea de una sola serie con cruz y tooltip al pasar el mouse. */
export function AreaChart({ data, valueKey, label, format, height = 260 }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const gid = useId().replace(/:/g, "");
  const pad = { top: 16, right: 16, bottom: 28, left: 64 };
  const w = Math.max(width, 280);
  const iw = w - pad.left - pad.right;
  const ih = height - pad.top - pad.bottom;
  const values = data.map((d) => d[valueKey]);
  const ticks = niceTicks(Math.max(...values, 0));
  const top = ticks[ticks.length - 1] || 1;
  const x = (i) => pad.left + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v) => pad.top + ih - (v / top) * ih;

  const linePath = monotonePath(data.map((d, i) => [x(i), y(d[valueKey])]));
  const areaPath = `${linePath}L${x(data.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;
  const step = Math.ceil(data.length / Math.max(2, Math.floor(iw / 70)));
  const lastIdx = data.length - 1;

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = Math.round(((px - pad.left) / iw) * (data.length - 1));
    setHover(Math.max(0, Math.min(lastIdx, i)));
  };

  const hi = hover ?? null;
  const tipLeft = hi !== null ? Math.min(Math.max(x(hi), 80), w - 80) : 0;

  return (
    <div ref={ref} className={styles.chartBox} style={{ height }}>
      {width > 0 && (
        <svg width={w} height={height} role="img" aria-label={label} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={`g${gid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--viz-series)" stopOpacity="0.38" />
              <stop offset="100%" stopColor="var(--viz-series)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={w - pad.right} y1={y(t)} y2={y(t)} className={t === 0 ? styles.baseline : styles.grid} />
              <text x={pad.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className={styles.axis}>
                {format === "cop" ? compactCOP(t) : t}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            (i % step === 0 && x(lastIdx) - x(i) >= 95) || i === lastIdx ? (
              <text key={d.fecha} x={x(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === lastIdx ? "end" : "middle"} className={styles.axis}>
                {fechaCorta(d.fecha)}
              </text>
            ) : null
          )}
          <path d={areaPath} fill={`url(#g${gid})`} />
          <path d={linePath} className={styles.line} />
          <circle cx={x(lastIdx)} cy={y(values[lastIdx])} r="4.5" className={styles.endDot} />
          {hi !== null && (
            <g>
              <line x1={x(hi)} x2={x(hi)} y1={pad.top} y2={pad.top + ih} className={styles.crosshair} />
              <circle cx={x(hi)} cy={y(values[hi])} r="5" className={styles.hoverDot} />
            </g>
          )}
        </svg>
      )}
      {hi !== null && (
        <div className={styles.tooltip} style={{ left: tipLeft, top: 6 }}>
          <span className={styles.tipDate}>{fechaCorta(data[hi].fecha)}</span>
          <strong>{format === "cop" ? `$${values[hi].toLocaleString("es-CO")}` : values[hi]}</strong>
          {data[hi].pedidos !== undefined && (
            <span className={styles.tipMeta}>
              {data[hi].pedidos} {data[hi].pedidos === 1 ? "pedido" : "pedidos"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Minigráfico de área para las tarjetas de indicadores (sin ejes). */
export function Sparkline({ values, height = 44, label }) {
  const [ref, width] = useWidth();
  const gid = useId().replace(/:/g, "");
  const w = Math.max(width, 60);
  const max = Math.max(...values, 0) || 1;
  const x = (i) => (values.length === 1 ? w / 2 : (i / (values.length - 1)) * (w - 4) + 2);
  const y = (v) => height - 3 - (v / max) * (height - 8);
  const line = monotonePath(values.map((v, i) => [x(i), y(v)]));
  const area = `${line}L${x(values.length - 1).toFixed(1)},${height}L${x(0).toFixed(1)},${height}Z`;
  return (
    <div ref={ref} className={styles.spark} style={{ height }}>
      {width > 0 && (
        <svg width={w} height={height} role="img" aria-label={label}>
          <defs>
            <linearGradient id={`s${gid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--viz-series)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--viz-series)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#s${gid})`} />
          <path d={line} className={styles.sparkLine} />
        </svg>
      )}
    </div>
  );
}

/**
 * Barras horizontales con etiqueta y valor escritos (el color nunca va solo).
 * items: [{ label, value, color? }]
 */
export function BarList({ items, format = (v) => v, empty = "Sin datos todavía" }) {
  const max = Math.max(...items.map((i) => i.value), 0);
  if (!items.length || max === 0) return <p className={styles.empty}>{empty}</p>;
  return (
    <ul className={styles.barList}>
      {items.map((it) => (
        <li key={it.label} title={`${it.label}: ${format(it.value)}`}>
          <div className={styles.barHead}>
            <span className={styles.barLabel}>
              {it.color && <i className={styles.swatch} style={{ background: it.color }} aria-hidden />}
              {it.label}
            </span>
            <span className={styles.barValue}>{format(it.value)}</span>
          </div>
          <div className={styles.track}>
            <span
              className={styles.bar}
              style={{ width: `${Math.max((it.value / max) * 100, it.value > 0 ? 2 : 0)}%`, background: it.color || "var(--viz-series)" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
