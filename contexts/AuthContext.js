import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Router from "next/router";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, firstname, lastname, is_admin, created_at")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user?.id);
      if (active) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      // Si el enlace de recuperación abre otra página (p. ej. el inicio), se lleva al usuario al formulario
      if (event === "PASSWORD_RECOVERY" && Router.pathname !== "/nueva-contrasena") {
        setTimeout(() => Router.replace("/nueva-contrasena"), 0);
      }
      // No se llama a Supabase dentro del callback directamente (recomendación de supabase-js)
      setTimeout(() => loadProfile(newSession?.user?.id), 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw translateAuthError(error);
  };

  const signUp = async ({ email, password, firstname, lastname }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { firstname, lastname },
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/cuenta` : undefined,
      },
    });
    if (error) throw translateAuthError(error);
    // Si Supabase pide confirmar el correo, no hay sesión todavía
    return { needsConfirmation: !data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async ({ firstname, lastname }) => {
    const userId = session?.user?.id;
    // Solo nombre y apellido: los usuarios no tienen permiso para tocar otras columnas
    const { data, error } = await supabase
      .from("profiles")
      .update({ firstname, lastname })
      .eq("id", userId)
      .select("id, firstname, lastname, is_admin, created_at")
      .single();
    if (error) throw error;
    setProfile(data);
  };

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    isAdmin: !!profile?.is_admin,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

function translateAuthError(error) {
  const msg = error?.message || "";
  const map = {
    "Invalid login credentials": "Correo o contraseña incorrectos",
    "Email not confirmed": "Debes confirmar tu correo antes de ingresar",
    "User already registered": "Ya existe una cuenta con este correo",
    "Password should be at least 6 characters": "La contraseña debe tener al menos 6 caracteres",
  };
  const found = Object.keys(map).find((k) => msg.includes(k));
  return new Error(found ? map[found] : msg || "No se pudo completar la operación");
}