import { enlaceWhatsapp, iniciales, primerNombre, telefonoLegible } from "@/lib/soporte";
import { useSoporte } from "@/hooks/useSoporte";
import { IconChat, IconChevronDown, IconClock, IconInstagram, IconMail, IconWhatsapp } from "@/components/Icons";
import styles from "./Soporte.module.scss";

/** Desplegable del carrito con los asesores. `resumen`: texto del pedido para el mensaje de WhatsApp. */
export function AyudaPedido({ resumen = "" }) {
  const datos = useSoporte();
  const contactos = datos?.contactos || [];
  if (datos && !contactos.length) return null;

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
        {!datos && <div className="spinner" />}
        {contactos.map((c) => (
          <Contacto key={c.id} c={c} resumen={resumen} />
        ))}
      </div>
    </details>
  );
}

function Contacto({ c, resumen }) {
  const wa = enlaceWhatsapp(
    c.whatsapp,
    `Hola ${primerNombre(c.name)}, tengo una duda con mi pedido en Momentum Shoes.${resumen ? `\n\n${resumen}` : ""}`
  );
  return (
    <div className={styles.contacto}>
      <div className={styles.asesor}>
        <span className={styles.avatar}>{iniciales(c.name)}</span>
        <div>
          <strong>{c.name}</strong>
          {c.role && <span>{c.role}</span>}
        </div>
      </div>

      <ul className={styles.datos}>
        {c.whatsapp && (
          <li>
            <IconWhatsapp width={18} height={18} />
            <a href={wa} target="_blank" rel="noopener noreferrer">
              {telefonoLegible(c.whatsapp)}
            </a>
          </li>
        )}
        {c.email && (
          <li>
            <IconMail width={18} height={18} />
            <a href={`mailto:${c.email}`}>{c.email}</a>
          </li>
        )}
        {c.instagram && (
          <li>
            <IconInstagram width={18} height={18} />
            <a href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noopener noreferrer">
              @{c.instagram}
            </a>
          </li>
        )}
        {c.schedule && (
          <li>
            <IconClock width={18} height={18} />
            <span>{c.schedule}</span>
          </li>
        )}
      </ul>

      {wa && (
        <a className={`btn btn-primary btn-block ${styles.waBtn}`} href={wa} target="_blank" rel="noopener noreferrer">
          <IconWhatsapp width={18} height={18} /> Escribir a {primerNombre(c.name)}
        </a>
      )}
    </div>
  );
}
