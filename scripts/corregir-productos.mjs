/**
 * Corrige datos de productos que ya existen (nombre, descripción, precio,
 * descuento, categoría, marca o stock por talla).
 *
 * 1. Edita la lista CAMBIOS de abajo. Cada cambio se identifica por el "uid"
 *    del producto (la parte final de su dirección: /producto/<uid>).
 *    Solo pon los campos que quieras cambiar.
 * 2. Prueba sin guardar nada:   node scripts/corregir-productos.mjs --prueba
 * 3. Aplica los cambios:        node scripts/corregir-productos.mjs
 *
 * Campos que puedes usar:
 *   name, description, price, discount (0 a 100),
 *   category (slug: casual, deportivo, formal, infantil),
 *   brand (slug: adidas, all-stars, nike, puma, skechers, vans),
 *   sizes: { "38": 5, "39": 0 }  -> fija el stock de esas tallas (crea la talla si no existe)
 */
import { cargarEnv, clienteSupabase, cargarCatalogo, validarTallas, listaSlugs } from "./_comun.mjs";

const CAMBIOS = [
  {
    uid: "adidas-terrex",
    // Hoy la descripción habla de las Adidas Superstar. Si en las fotos el zapato
    // en realidad es un Superstar, cambia mejor el nombre (name) y borra esta descripción.
    description:
      "Las Adidas Terrex están pensadas para salir del asfalto. Su suela de buen agarre y su estructura resistente dan estabilidad en senderos, caminos de tierra y días de lluvia, sin perder la comodidad para el uso diario. Una opción ideal para quienes buscan un tenis deportivo listo para la aventura.",
  },
  {
    uid: "adidas-stand-smith",
    name: "ADIDAS STAN SMITH",
  },
  {
    uid: "puma-park",
    name: "PUMA PARK",
  },
  // Si KUROMI Y MY MELODY no es de Adidas, quita las barras de la línea de abajo y pon la marca correcta:
  // { uid: "kuromi-y-my-melody", brand: "nike" },
];

const PRUEBA = process.argv.includes("--prueba");
cargarEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
const supabase = clienteSupabase();
const { categorias, marcas } = await cargarCatalogo(supabase);

const CAMPOS = ["uid", "name", "description", "price", "discount", "category", "brand", "sizes"];
let aplicados = 0;
let conError = 0;

if (PRUEBA) console.log("MODO PRUEBA: no se guarda nada.\n");

for (const cambio of CAMBIOS) {
  const errores = [];
  const desconocidos = Object.keys(cambio).filter((k) => !CAMPOS.includes(k));
  if (desconocidos.length) errores.push(`Campos desconocidos: ${desconocidos.join(", ")}`);

  const { data: producto, error } = await supabase
    .from("products")
    .select("id, uid, name, description, price, discount, category_id, brand_id, product_sizes(numero, stock)")
    .eq("uid", cambio.uid)
    .maybeSingle();
  if (error) throw error;
  if (!producto) {
    console.log(`X  ${cambio.uid}: no existe ningún producto con ese uid`);
    conError++;
    continue;
  }

  const update = {};
  if ("name" in cambio) {
    const nombre = String(cambio.name).trim();
    if (!nombre) errores.push("El nombre no puede estar vacío");
    else update.name = nombre;
  }
  if ("description" in cambio) update.description = String(cambio.description).trim();
  if ("price" in cambio) {
    if (!Number.isInteger(cambio.price) || cambio.price < 1500) errores.push("price debe ser un número entero de 1500 o más (pesos, sin puntos)");
    else update.price = cambio.price;
  }
  if ("discount" in cambio) {
    if (typeof cambio.discount !== "number" || cambio.discount < 0 || cambio.discount > 100) errores.push("discount debe estar entre 0 y 100");
    else update.discount = cambio.discount;
  }
  if ("category" in cambio) {
    const c = categorias.get(cambio.category);
    if (!c) errores.push(`Categoría "${cambio.category}" no existe. Opciones: ${listaSlugs(categorias)}`);
    else update.category_id = c.id;
  }
  if ("brand" in cambio) {
    const b = marcas.get(cambio.brand);
    if (!b) errores.push(`Marca "${cambio.brand}" no existe. Opciones: ${listaSlugs(marcas)}`);
    else update.brand_id = b.id;
  }
  const tallas = "sizes" in cambio ? validarTallas(cambio.sizes, errores) : [];

  if (errores.length) {
    console.log(`X  ${cambio.uid}:\n   - ${errores.join("\n   - ")}`);
    conError++;
    continue;
  }

  console.log(`>  ${cambio.uid}`);
  for (const [k, v] of Object.entries(update)) {
    const antes = producto[k];
    const ver = (x) => (typeof x === "string" && x.length > 70 ? x.slice(0, 70) + "…" : JSON.stringify(x));
    console.log(`   ${k}: ${ver(antes)}  ->  ${ver(v)}`);
  }
  for (const t of tallas) {
    const actual = producto.product_sizes.find((s) => s.numero === t.numero);
    console.log(`   talla ${t.numero}: stock ${actual ? actual.stock : "(no existe)"}  ->  ${t.stock}`);
  }

  if (PRUEBA) continue;

  if (Object.keys(update).length) {
    const { error: e } = await supabase.from("products").update(update).eq("id", producto.id);
    if (e) {
      console.log(`   No se pudo guardar: ${e.message}`);
      conError++;
      continue;
    }
  }
  if (tallas.length) {
    const { error: e } = await supabase
      .from("product_sizes")
      .upsert(tallas.map((t) => ({ product_id: producto.id, ...t })), { onConflict: "product_id,numero" });
    if (e) {
      console.log(`   No se pudieron guardar las tallas: ${e.message}`);
      conError++;
      continue;
    }
  }
  aplicados++;
  console.log("   Guardado");
}

console.log(
  PRUEBA
    ? `\nPrueba terminada. Si todo se ve bien, ejecuta sin --prueba.`
    : `\nListo: ${aplicados} producto(s) corregidos${conError ? `, ${conError} con error` : ""}.`
);
