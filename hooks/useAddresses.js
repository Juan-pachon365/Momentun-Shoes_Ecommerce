import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const FIELDS = "id, title, name, address, house_apartment, locality, city, postal_code, phone, created_at";

export function useAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("addresses")
      .select(FIELDS)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setAddresses(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = async (values, id) => {
    const payload = { ...values, user_id: user.id };
    const query = id
      ? supabase.from("addresses").update(payload).eq("id", id).select(FIELDS).single()
      : supabase.from("addresses").insert(payload).select(FIELDS).single();
    const { data, error } = await query;
    if (error) throw new Error("No se pudo guardar la dirección");
    await refresh();
    return data;
  };

  const remove = async (id) => {
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) throw new Error("No se pudo eliminar la dirección");
    await refresh();
  };

  return { addresses, loading, refresh, save, remove };
}
