import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const router = useRouter();
  const [ids, setIds] = useState([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setIds([]);
      return;
    }
    const { data } = await supabase
      .from("wishlists")
      .select("product_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setIds((data || []).map((w) => w.product_id));
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isInWishlist = (productId) => ids.includes(productId);

  const toggle = async (productId) => {
    if (!user) {
      notify("Ingresa a tu cuenta para guardar favoritos");
      router.push(`/ingresar?next=${encodeURIComponent(router.asPath)}`);
      return;
    }

    if (isInWishlist(productId)) {
      setIds((prev) => prev.filter((id) => id !== productId));
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);
      if (error) {
        notify("No se pudo quitar de favoritos", "danger");
        refresh();
      } else notify("Quitado de favoritos");
    } else {
      setIds((prev) => [productId, ...prev]);
      const { error } = await supabase.from("wishlists").insert({ user_id: user.id, product_id: productId });
      if (error) {
        notify("No se pudo agregar a favoritos", "danger");
        refresh();
      } else notify("Agregado a favoritos", "success");
    }
  };

  return (
    <WishlistContext.Provider value={{ ids, count: ids.length, isInWishlist, toggle, refresh }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
