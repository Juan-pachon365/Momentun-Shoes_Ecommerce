import { supabase } from "./supabase";

// Llama a una API route propia enviando el token del usuario autenticado.
export async function apiFetch(path, { method = "GET", body } = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Ocurrió un error inesperado");
  }
  return data;
}
