import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { formatPrice } from "@/lib/format";
import { CiudadSelect } from "./CiudadSelect";
import styles from "./Envio.module.scss";

/* Estado compartido con el resumen del carrito y el botón de pago */
let seleccion = null; // { id, price, carrierName, serviceName }
let version = 0; // sube cuando hay que volver a cotizar
const oyentes = new Set();
const avisar = () => oyentes.forEach((fn) => fn({ seleccion, version }));
export const elegirEnvio = (op) => {
  seleccion = op;
  avisar();
};
export const recotizarEnvio = () => {
  seleccion = null;
  version += 1;
  avisar();
};
export function useEnvioElegido() {
  const [estado, setEstado] = useState({ seleccion, version });
  useEffect(() => {
    oyentes.add(setEstado);
    return () => oyentes.delete(setEstado);
  }, []);
  return estado;
}

const fecha = (iso) => {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
};

/** Opciones de transportadora para la dirección elegida */
export function OpcionesEnvio({ address, items, onGuardarCiudad }) {
  const { seleccion: elegido, version: v } = useEnvioElegido();
  const [estado, setEstado] = useState({ cargando: false, opciones: [], error: "", sinCiudad: false });
  const [guardando, setGuardando] = useState(false);
  const peticion = useRef(0);

  const clave = JSON.stringify(items.map((i) => [i.productId, i.size, i.quantity]));

  useEffect(() => {
    if (!address) return;
    if (!address.city_code) {
      elegirEnvio(null);
      setEstado({ cargando: false, opciones: [], error: "", sinCiudad: true });
      return;
    }
    const n = ++peticion.current;
    elegirEnvio(null);
    setEstado({ cargando: true, opciones: [], error: "", sinCiudad: false });
    apiFetch("/api/envio/cotizar", {
      method: "POST",
      body: { addressId: address.id, items: items.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity })) },
    })
      .then(({ opciones }) => {
        if (n !== peticion.current) return;
        setEstado({ cargando: false, opciones, error: "", sinCiudad: false });
        elegirEnvio(opciones[0]); // la más económica queda elegida por defecto
      })
      .catch((e) => {
        if (n !== peticion.current) return;
        setEstado({ cargando: false, opciones: [], error: e.message, sinCiudad: false });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address?.id, address?.city_code, clave, v]);

  if (!address) return null;

  return (
    <section className={styles.envio} aria-label="Opciones de envío">
      <h3>¿Cómo quieres recibirlo?</h3>

      {estado.sinCiudad && (
        <div className={styles.aviso}>
          <p>
            Para calcular el envío a <b>{address.title}</b>, elige su ciudad:
          </p>
          <div className={`field ${styles.campo}`}>
          <CiudadSelect
            id="envio-ciudad"
            value=""
            onChange={async (c) => {
              if (!c) return;
              setGuardando(true);
              try {
                await onGuardarCiudad(address, c);
              } finally {
                setGuardando(false);
              }
            }}
          />
          {guardando && <small className="field-hint">Guardando...</small>}
          </div>
        </div>
      )}

      {estado.cargando && (
        <div className={styles.cargando} aria-live="polite">
          <span className={styles.skeleton} />
          <span className={styles.skeleton} />
          <span className={styles.skeleton} />
          <small>Consultando transportadoras para {address.city}...</small>
        </div>
      )}

      {estado.error && (
        <div className={styles.aviso}>
          <p>{estado.error}</p>
          <button type="button" className="btn btn-outline" onClick={recotizarEnvio}>
            Intentar de nuevo
          </button>
        </div>
      )}

      {estado.opciones.length > 0 && (
        <div className={styles.opciones} role="radiogroup" aria-label="Transportadora">
          {estado.opciones.map((op, i) => {
            const activo = elegido?.id === op.id;
            return (
              <button
                key={op.id}
                type="button"
                role="radio"
                aria-checked={activo}
                className={`${styles.opcion} ${activo ? styles.activa : ""}`}
                onClick={() => elegirEnvio(op)}
              >
                <span className={styles.radio} aria-hidden="true" />
                <span className={styles.info}>
                  <strong>
                    {op.carrierName}
                    {i === 0 && <em className={styles.tag}>Más económica</em>}
                  </strong>
                  <small>
                    {op.estimate}
                    {op.date ? ` · llega aprox. el ${fecha(op.date)}` : ""}
                  </small>
                </span>
                <span className={styles.precio}>{formatPrice(op.price)}</span>
              </button>
            );
          })}
          <p className={styles.nota}>Precios calculados por Envia.com para {address.city}. El envío se paga junto con tu pedido.</p>
        </div>
      )}
    </section>
  );
}
