import Link from "next/link";
import styles from "./EmptyState.module.scss";

export function EmptyState({ icon, title, text, actionHref, actionLabel }) {
  return (
    <div className={styles.empty}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {actionHref && (
        <Link href={actionHref} className="btn btn-primary">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
