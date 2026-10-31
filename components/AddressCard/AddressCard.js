import styles from "./AddressCard.module.scss";

export function addressLines(a) {
  return [
    [a.address, a.house_apartment].filter(Boolean).join(", "),
    [a.locality, a.city].filter(Boolean).join(", ") + (a.postal_code ? ` (${a.postal_code})` : ""),
    a.phone ? `Tel. ${a.phone}` : "",
  ].filter(Boolean);
}

export function AddressCard({ address, selected, onSelect, actions }) {
  const Tag = onSelect ? "button" : "div";
  return (
    <Tag
      type={onSelect ? "button" : undefined}
      className={`${styles.card} ${onSelect ? styles.selectable : ""} ${selected ? styles.selected : ""}`}
      onClick={onSelect}
      aria-pressed={onSelect ? !!selected : undefined}
    >
      <div className={styles.top}>
        <strong>{address.title}</strong>
        {onSelect && <span className={styles.radio} aria-hidden />}
      </div>
      <span className={styles.name}>{address.name}</span>
      {addressLines(address).map((l) => (
        <span key={l} className={styles.line}>
          {l}
        </span>
      ))}
      {actions && <div className={styles.actions}>{actions}</div>}
    </Tag>
  );
}
