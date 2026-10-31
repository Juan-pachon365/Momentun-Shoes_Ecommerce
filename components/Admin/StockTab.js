import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { cdn, formatPrice } from "@/lib/format";
import { useToast } from "@/contexts/ToastContext";
import styles from "./Admin.module.scss";

const LOW = 2;

// Arma el cuerpo que espera /api/admin/productos a partir de un producto existente
export function payloadDesdeProducto(p, sizes) {
  return {
    id: p.id,
    uid: p.uid,
    name: p.name,
    price: Number(p.price),
    discount: Number(p.discount || 0),
    description: p.description || "",
    category_id: p.category_id,
    brand_id: p.brand_id,
    cover: p.cover,
    wallpaper: p.wallpaper || null,
    image_gallery: p.image_gallery || [],
    sizes: sizes || p.product_sizes.map((s) => ({ numero: s.numero, stock: s.stock })),
  };
}

export function StockTab() {
  const { notify } = useToast();
  const [productos, setProductos] = useState(null);
  const [error, setError] = useState("");
  const [buscar, setBuscar] = useState("");
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [cambios, setCambios] = useState({}); // { productId: { numero: stock } }
  const [guardando, setGuardando] = useState(null);

  const cargar = () =>
    apiFetch("/api/admin/productos")
      .then((d) => setProductos(d.productos))
      .catch((e) => setError(e.message));

  useEffect(() => {
    cargar();
  }, []);

  const q = buscar.trim().toLowerCase();
  const visibles = useMemo(
    () =>
      (productos || []).filter((p) => {
        if (q && !`${p.name} ${p.brand?.name || ""} ${p.category?.title || ""}`.toLowerCase().includes(q)) return false;
        if (soloAlertas && !p.product_sizes.some((s) => s.stock <= LOW)) return false;
        return true;
      }),
    [productos, q, soloAlertas]
  );

  const setStock = (pid, numero, valor) => {
    setCambios((prev) => ({ ...prev, [pid]: { ...(prev[pid] || {}), [numero]: valor } }));
  };

  const guardar = async (p) => {
    const edit = cambios[p.id] || {};
    const sizes = p.product_sizes.map((s) => {
      const v = edit[s.numero];
      return { numero: s.numero, stock: v === undefined ? s.stock : Number(v) };
    });
    if (sizes.some((s) => !Number.isInteger(s.stock) || s.stock < 0)) {
      notify("El stock debe ser un número entero de 0 o más", "danger");
      return;
    }
    setGuardando(p.id);
    try {
      await apiFetch("/api/admin/productos", { method: "PATCH", body: payloadDesdeProducto(p, sizes) });
      setProductos((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, product_sizes: x.product_sizes.map((s) => ({ ...s, stock: sizes.find((z) => z.numero === s.numero).stock })) } : x))
      );
      setCambios((prev) => {
        const n = { ...prev };
        delete n[p.id];
        return n;
      });
      notify(`Stock de ${p.name.trim()} actualizado`, "success");
    } catch (e) {
      notify(e.message, "danger");
    }
    setGuardando(null);
  };

  if (error) return <div className="form-error">{error}</div>;
  if (!productos) return <div className="spinner" />;

  return (
    <div>
      <div className={styles.filters}>
        <label className="sr-only" htmlFor="s-buscar">Buscar zapato</label>
        <input id="s-buscar" type="search" placeholder="Buscar por nombre, marca o categoría" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        <label className={styles.check} htmlFor="s-alertas">
          <input id="s-alertas" type="checkbox" checked={soloAlertas} onChange={(e) => setSoloAlertas(e.target.checked)} />
          Solo agotados o por agotarse
        </label>
        <Link href="/admin?tab=zapato" className="btn btn-primary">
          Nuevo zapato
        </Link>
      </div>
      <div className={styles.legend}>
        <span className={styles.bad}>■ Agotada (0)</span>
        <span className={styles.warn}>■ Por agotarse ({LOW} o menos)</span>
        <span>Cambia los números y toca Guardar.</span>
      </div>

      {visibles.length === 0 && <p className="muted">No hay zapatos con estos filtros.</p>}

      <div className={styles.stockList}>
        {visibles.map((p) => {
          const edit = cambios[p.id] || {};
          const hayCambios = Object.keys(edit).length > 0;
          const total = p.product_sizes.reduce((a, s) => a + (edit[s.numero] !== undefined ? Number(edit[s.numero]) || 0 : s.stock), 0);
          return (
            <div key={p.id} className={styles.stockRow}>
              <span className={styles.thumb}>
                {p.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cdn(p.cover, 120)} alt="" />
                )}
              </span>
              <div className={styles.stockInfo}>
                <strong>{p.name.trim()}</strong>
                <small>
                  {[p.brand?.name, p.category?.title].filter(Boolean).join(" · ")} · {formatPrice(p.price)}
                  {Number(p.discount) > 0 && ` (-${Number(p.discount)}%)`} · {total} pares
                </small>
                <div className={styles.sizes}>
                  {p.product_sizes.map((s) => {
                    const valor = edit[s.numero] !== undefined ? edit[s.numero] : s.stock;
                    const num = Number(valor);
                    const cls = edit[s.numero] !== undefined && num !== s.stock ? styles.sizeChanged : num === 0 ? styles.sizeOut : num <= LOW ? styles.sizeLow : "";
                    const id = `st-${p.id}-${s.numero}`;
                    return (
                      <label key={s.numero} className={`${styles.size} ${cls}`} htmlFor={id}>
                        <span>T{s.numero}</span>
                        <input id={id} type="number" min="0" inputMode="numeric" value={valor} onChange={(e) => setStock(p.id, s.numero, e.target.value)} />
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className={styles.stockActions}>
                <button className="btn btn-primary" disabled={!hayCambios || guardando === p.id} onClick={() => guardar(p)}>
                  {guardando === p.id ? "Guardando..." : "Guardar"}
                </button>
                {hayCambios && (
                  <button
                    className="btn btn-ghost"
                    onClick={() =>
                      setCambios((prev) => {
                        const n = { ...prev };
                        delete n[p.id];
                        return n;
                      })
                    }
                  >
                    Deshacer
                  </button>
                )}
                <Link href={`/admin?tab=zapato&editar=${p.uid}`} className="btn btn-outline">
                  Editar
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
