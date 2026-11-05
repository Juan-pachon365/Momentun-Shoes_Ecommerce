import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

let cache = null;

/** Ciudades con envío activo (se cargan una vez por visita) */
export function useCiudades() {
  const [ciudades, setCiudades] = useState(cache?.data || null);
  useEffect(() => {
    if (!cache) {
      cache = supabase
        .from("shipping_cities")
        .select("dane_code, name, department, position")
        .order("position")
        .order("name")
        .then(({ data }) => {
          cache.data = data || [];
          return cache.data;
        });
    }
    let activo = true;
    Promise.resolve(cache).then((d) => activo && setCiudades(cache.data || d));
    return () => {
      activo = false;
    };
  }, []);
  return ciudades;
}

const normalizar = (t) =>
  String(t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, "")
    .replace(/\s+(dc|d c)$/, "")
    .trim();

/** Busca una ciudad por su nombre escrito a mano (direcciones guardadas antes de la lista) */
export function buscarCiudadPorNombre(ciudades, nombre) {
  const n = normalizar(nombre);
  if (!n || !ciudades) return null;
  return ciudades.find((c) => normalizar(c.name) === n) || null;
}
