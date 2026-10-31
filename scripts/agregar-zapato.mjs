/**
 * Agrega un zapato nuevo: sube sus fotos a Cloudinary y lo crea en Supabase
 * con sus tallas y stock.
 *
 * 1. Crea una carpeta para el zapato dentro de scripts/zapatos/, por ejemplo:
 *      scripts/zapatos/vans-old-skool/
 *        zapato.json      <- datos del zapato (copia el de scripts/zapatos/_ejemplo)
 *        cover.jpg        <- foto principal (obligatoria)
 *        wallpaper.jpg    <- foto horizontal grande (opcional)
 *        gallery-1.jpg    <- fotos extra (opcionales: gallery-1, gallery-2, ...)
 *    Las fotos pueden ser .jpg, .jpeg, .png o .webp.
 * 2. Prueba sin subir ni guardar nada:
 *      node scripts/agregar-zapato.mjs scripts/zapatos/vans-old-skool --prueba
 * 3. Crea el zapato:
 *      node scripts/agregar-zapato.mjs scripts/zapatos/vans-old-skool
 *
 * Si el zapato ya existe (mismo uid), el script se detiene. Para actualizarlo
 * (datos, fotos o stock) agrega --actualizar al final.
 */
import fs from "node:fs";
import path from "node:path";
import {
  cargarEnv,
  clienteSupabase,
  configurarCloudinary,
  cargarCatalogo,
  validarTallas,
  slugify,
  listaSlugs,
} from "./_comun.mjs";

const args = process.argv.slice(2);
const PRUEBA = args.includes("--prueba");
const ACTUALIZAR = args.includes("--actualizar");
const carpeta = args.find((a) => !a.startsWith("--"));

if (!carpeta) {
  console.error("Uso: node scripts/agregar-zapato.mjs scripts/zapatos/<carpeta> [--prueba] [--actualizar]");
  process.exit(1);
}
if (!fs.existsSync(carpeta) || !fs.statSync(carpeta).isDirectory()) {
  console.error(`No encuentro la carpeta "${carpeta}".`);
  process.exit(1);
}

const necesarias = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
if (!PRUEBA) necesarias.push("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET");
cargarEnv(necesarias);

// ---------- 1. Leer y validar zapato.json ----------
const archivoJson = path.join(carpeta, "zapato.json");
if (!fs.existsSync(archivoJson)) {
  console.error(`Falta ${archivoJson}. Copia el de scripts/zapatos/_ejemplo/zapato.json y llénalo.`);
  process.exit(1);
}
let datos;
try {
  datos = JSON.parse(fs.readFileSync(archivoJson, "utf8"));
} catch (e) {
  console.error(`zapato.json tiene un error de formato: ${e.message}`);
  console.error("Revisa que las comillas, comas y llaves estén bien. No dejes una coma después del último campo.");
  process.exit(1);
}

const supabase = clienteSupabase();
const { categorias, marcas } = await cargarCatalogo(supabase);
const errores = [];

const nombre = String(datos.name || "").trim();
if (!nombre) errores.push('Falta "name"');
const uid = slugify(datos.uid || nombre);
if (!uid) errores.push('No se pudo armar el "uid". Pon un "name" o un "uid".');

const categoria = categorias.get(datos.category);
if (!categoria) errores.push(`"category" debe ser una de: ${listaSlugs(categorias)}`);
const marca = marcas.get(datos.brand);
if (!marca) errores.push(`"brand" debe ser una de: ${listaSlugs(marcas)}`);

if (!Number.isInteger(datos.price) || datos.price < 1500) errores.push('"price" debe ser un número entero de 1500 o más (pesos, sin puntos ni comillas)');
const descuento = datos.discount ?? 0;
if (typeof descuento !== "number" || descuento < 0 || descuento > 100) errores.push('"discount" debe estar entre 0 y 100');

const descripcion = String(datos.description || "").trim();
if (!descripcion) errores.push('Falta "description"');

const tallas = validarTallas(datos.sizes, errores);
if (datos.sizes && !tallas.length && !errores.some((e) => e.includes("Talla") || e.includes("stock"))) errores.push("Agrega al menos una talla");

// ---------- 2. Buscar las fotos ----------
const EXT = [".jpg", ".jpeg", ".png", ".webp"];
const buscarFoto = (base) => EXT.map((e) => path.join(carpeta, base + e)).find((f) => fs.existsSync(f));
const fotoCover = buscarFoto("cover");
const fotoWallpaper = buscarFoto("wallpaper");
const fotosGaleria = [];
for (let i = 1; i <= 20; i++) {
  const f = buscarFoto(`gallery-${i}`);
  if (!f) break;
  fotosGaleria.push(f);
}
if (!fotoCover) errores.push("Falta la foto principal: cover.jpg (o .png / .webp) dentro de la carpeta");

// ---------- 3. ¿Ya existe? ----------
const { data: existente, error: errExiste } = await supabase.from("products").select("id, name").eq("uid", uid).maybeSingle();
if (errExiste) throw errExiste;
if (existente && !ACTUALIZAR) {
  errores.push(`Ya existe un producto con uid "${uid}" (${existente.name.trim()}). Si quieres actualizarlo, agrega --actualizar.`);
}

if (errores.length) {
  console.error(`No se puede continuar:\n - ${errores.join("\n - ")}`);
  process.exit(1);
}

console.log(`${existente ? "Actualizar" : "Crear"}: ${nombre}`);
console.log(`  uid:        ${uid}  (quedará en /producto/${uid})`);
console.log(`  marca:      ${marca.name}`);
console.log(`  categoría:  ${categoria.title}`);
console.log(`  precio:     $${datos.price.toLocaleString("es-CO")}${descuento ? `  (-${descuento}%)` : ""}`);
console.log(`  tallas:     ${tallas.map((t) => `${t.numero}(${t.stock})`).join("  ")}`);
console.log(`  fotos:      ${[fotoCover, fotoWallpaper, ...fotosGaleria].filter(Boolean).map((f) => path.basename(f)).join(", ")}`);

if (PRUEBA) {
  console.log("\nPrueba terminada: todo está correcto. Ejecuta sin --prueba para crearlo.");
  process.exit(0);
}

// ---------- 4. Subir fotos a Cloudinary ----------
const cloudinary = configurarCloudinary();
async function subir(archivo, nombrePublico) {
  const r = await cloudinary.uploader.upload(archivo, {
    folder: `momentum-shoes/${uid}`,
    public_id: nombrePublico,
    overwrite: true,
    invalidate: true,
    resource_type: "image",
  });
  console.log(`  subida ${path.basename(archivo)}`);
  return r.secure_url;
}

let cover, wallpaper, galeria;
try {
  console.log("\nSubiendo fotos a Cloudinary...");
  cover = await subir(fotoCover, "cover");
  wallpaper = fotoWallpaper ? await subir(fotoWallpaper, "wallpaper") : null;
  galeria = [];
  for (let i = 0; i < fotosGaleria.length; i++) galeria.push(await subir(fotosGaleria[i], `gallery-${i + 1}`));
} catch (e) {
  console.error(`No se pudieron subir las fotos: ${e.message || e.error?.message || e}`);
  console.error("Revisa CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en .env.local. No se guardó nada en Supabase.");
  process.exit(1);
}

// ---------- 5. Guardar en Supabase ----------
const fila = {
  uid,
  name: nombre,
  description: descripcion,
  price: datos.price,
  discount: descuento,
  category_id: categoria.id,
  brand_id: marca.id,
  cover,
  image_gallery: galeria,
};
if (wallpaper || !existente) fila.wallpaper = wallpaper;

const { data: producto, error: errProducto } = existente
  ? await supabase.from("products").update(fila).eq("id", existente.id).select("id").single()
  : await supabase.from("products").insert(fila).select("id").single();
if (errProducto) {
  console.error(`No se pudo guardar el producto: ${errProducto.message}`);
  process.exit(1);
}

const { error: errTallas } = await supabase
  .from("product_sizes")
  .upsert(tallas.map((t) => ({ product_id: producto.id, ...t })), { onConflict: "product_id,numero" });
if (errTallas) {
  console.error(`El producto se guardó, pero las tallas no: ${errTallas.message}`);
  console.error("Vuelve a ejecutar el script con --actualizar para reintentar.");
  process.exit(1);
}

console.log(`\nListo: ${nombre} ${existente ? "actualizado" : "creado"}.`);
console.log(`Míralo en http://localhost:3000/producto/${uid}`);
if (existente) console.log("Nota: las tallas que no están en zapato.json se dejan como estaban (no se borran).");
