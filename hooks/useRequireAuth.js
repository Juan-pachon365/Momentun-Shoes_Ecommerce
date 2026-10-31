import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";

// Redirige a /ingresar si no hay sesión. Devuelve { user, loading }.
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/ingresar?next=${encodeURIComponent(router.asPath)}`);
    }
  }, [loading, user, router]);

  return { user, loading: loading || !user };
}
