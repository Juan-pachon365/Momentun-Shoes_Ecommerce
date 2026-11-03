import { CONTACTO, enlaceWhatsapp, telefonoLegible } from "@/lib/soporte";
import { IconChat, IconChevronDown, IconClock, IconInstagram, IconMail, IconWhatsapp } from "@/components/Icons";
import styles from "./Soporte.module.scss";

/** Desplegable del carrito con los datos del asesor. `resumen`: texto del pedido para el mensaje de WhatsApp. */
export function AyudaPedido({ resumen = "" }) {
  const mensaje = `Hola ${CONTACTO.asesor.split(" ")[0]}, tengo una duda con mi pedido en Momentum Shoes.${
    resumen ? `\n\n${resumen}` : ""
  }`;
  const wa = enlaceWhatsapp(mensaje);
  const iniciales = CONTACTO.asesor
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

  return (
    <details className={styles.ayuda}>
      <summary>
        <span className={styles.ayudaIcon}>
          <IconChat width={18} height={18} />
        </span>
        <span className={styles.ayudaTitle}>
          ¿Tienes dudas con tu pedido?
          <small>Te asesoramos por chat</small>
        </span>
        <IconChevronDown className={styles.chevron} width={18} height={18} />
      </summary>

      <div className={styles.ayudaBody}>
        <div className={styles.asesor}>
          <span className={styles.avatar}>{iniciales}</span>
          <div>
            <strong>{CONTACTO.asesor}</strong>
            <span>{CONTACTO.cargo}</span>
          </div>
        </div>

        <ul className={styles.datos}>
          {CONTACTO.whatsapp && (
            <li>
              <IconWhatsapp width={18} height={18} />
              <a href={wa} target="_blank" rel="noopener noreferrer">
                {telefonoLegible()}
              </a>
            </li>
          )}
          {CONTACTO.correo && (
            <li>
              <IconMail width={18} height={18} />
              <a href={`mailto:${CONTACTO.correo}`}>{CONTACTO.correo}</a>
            </li>
          )}
          {CONTACTO.instagram && (
            <li>
              <IconInstagram width={18} height={18} />
              <a href={`https://instagram.com/${CONTACTO.instagram}`} target="_blank" rel="noopener noreferrer">
                @{CONTACTO.instagram}
              </a>
            </li>
          )}
          {CONTACTO.horario && (
            <li>
              <IconClock width={18} height={18} />
              <span>{CONTACTO.horario}</span>
            </li>
          )}
        </ul>

        {wa && (
          <a className={`btn btn-primary btn-block ${styles.waBtn}`} href={wa} target="_blank" rel="noopener noreferrer">
            <IconWhatsapp width={18} height={18} /> Escribir por WhatsApp
          </a>
        )}
      </div>
    </details>
  );
}
