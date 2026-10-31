// Solo permite redirigir a rutas internas del sitio
export function safeNext(next, fallback = "/") {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
