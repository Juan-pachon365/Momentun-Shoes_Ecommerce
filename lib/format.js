const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatPrice(value) {
  return copFormatter.format(Math.round(Number(value) || 0));
}

// Precio final aplicando el descuento (porcentaje 0-100). Mismo cálculo que usa el servidor.
export function finalPrice(price, discount = 0) {
  const p = Number(price) || 0;
  const d = Number(discount) || 0;
  return Math.round(p - (p * d) / 100);
}

// Pide a Cloudinary una versión optimizada de la imagen (formato y calidad automáticos).
export function cdn(url, width) {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  const transforms = ["f_auto", "q_auto"];
  if (width) transforms.push(`w_${width}`, "c_limit");
  return url.replace("/upload/", `/upload/${transforms.join(",")}/`);
}

export function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export const PAYMENT_STATUS = {
  PENDING: { label: "Pendiente", tone: "warning" },
  APPROVED: { label: "Aprobado", tone: "success" },
  DECLINED: { label: "Rechazado", tone: "danger" },
  VOIDED: { label: "Anulado", tone: "muted" },
  ERROR: { label: "Error", tone: "danger" },
};

export function totalStock(product) {
  return (product?.product_sizes || []).reduce((acc, s) => acc + (s.stock || 0), 0);
}
