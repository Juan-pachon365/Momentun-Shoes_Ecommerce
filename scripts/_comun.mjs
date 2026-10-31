// Utilidades compartidas por los scripts de la carpeta scripts/.
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";

export function cargarEnv(necesarias) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    console.error("No encontré .env.local. Ejecuta el script desde la carpeta del proyecto (momentum-frontend).");
    process.exit(1);
  }
  const faltan = necesarias.filter((k) => !process.env[k]);
  if (faltan.length) {
    console.error(`Faltan en .env.local: ${faltan.join(", ")}`);
    process.exit(1);
  }
}

export function clienteSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function configurarCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

// "Nike Air Max 90" -> "nike-air-max-90"
export function slugify(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Busca categorías y marcas por slug. Devuelve { categorias: Map, marcas: Map }
export async function cargarCatalogo(supabase) {
  const [cats, brands] = await Promise.all([
    supabase.from("categories").select("id, slug, title"),
    supabase.from("brands").select("id, slug, name"),
  ]);
  if (cats.error) throw cats.error;
  if (brands.error) throw brands.error;
  return {
    categorias: new Map(cats.data.map((c) => [c.slug, c])),
    marcas: new Map(brands.data.map((b) => [b.slug, b])),
  };
}

// Valida { "36": 5, "37": 3 } y lo convierte en [{ numero, stock }]
export function validarTallas(tallas, errores) {
  if (!tallas || typeof tallas !== "object" || Array.isArray(tallas)) {
    errores.push('"sizes" debe ser un objeto como { "36": 5, "37": 3 }');
    return [];
  }
  const filas = [];
  for (const [num, stock] of Object.entries(tallas)) {
    const numero = Number(num);
    if (!Number.isInteger(numero) || numero < 15 || numero > 50) errores.push(`Talla inválida: "${num}"`);
    else if (!Number.isInteger(stock) || stock < 0) errores.push(`El stock de la talla ${num} debe ser un número entero de 0 o más`);
    else filas.push({ numero, stock });
  }
  return filas.sort((a, b) => a.numero - b.numero);
}

export const listaSlugs = (mapa) => [...mapa.keys()].sort().join(", ");
