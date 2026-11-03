import { useEffect, useState } from "react";
import { cargarSoporte } from "@/lib/soporte";

/** Datos del chat de ayuda y contactos. `null` mientras cargan. */
export function useSoporte() {
  const [datos, setDatos] = useState(null);
  useEffect(() => {
    let activo = true;
    cargarSoporte().then((d) => activo && setDatos(d));
    return () => {
      activo = false;
    };
  }, []);
  return datos;
}
