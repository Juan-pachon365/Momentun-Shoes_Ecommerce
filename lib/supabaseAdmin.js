import { createClient } from "@supabase/supabase-js";

// SOLO SERVIDOR (carpeta pages/api). Usa la service_role key, que salta las políticas RLS.
// Nunca importes este archivo desde un componente o página.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
