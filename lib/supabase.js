import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cliente público: sirve en el navegador y en getServerSideProps para datos públicos.
// Las políticas RLS de Supabase limitan lo que cada usuario puede ver o modificar.
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: typeof window !== "undefined",
  },
});
