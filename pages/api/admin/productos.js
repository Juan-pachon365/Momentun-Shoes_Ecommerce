import { refrescarTienda, requireAdmin, slugify } from "@/lib/adminAuth";

const CAMPOS_LISTA =
  "id, uid, name, price, discount, description, cover, wallpaper, image_gallery, created_at, category_id, brand_id, category:categories(id, title, slug), brand:brands(id, name, slug), product_sizes(id, numero, stock)";

/** Valida los datos del formulario. Devuelve { fila, tallas, errores } */
function validar(body, { categorias, marcas, cloudName }) {
  const errores = [];
  const name = String(body.name || "").trim();
  if (!name) errores.push("Escribe el nombre del zapato");
  const uid = slugify(body.uid || name);
  if (!uid) errores.push("No se pudo armar la dirección (uid) del zapato");

  const price = Number(body.price);
  if (!Number.isInteger(price) || price < 1500) errores.push("El precio debe ser un número entero de 1.500 o más");
  const discount = Number(body.discount ?? 0);
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) errores.push("El descuento debe estar entre 0 y 100");

  if (!categorias.has(body.category_id)) errores.push("Elige una categoría");
  if (!marcas.has(body.brand_id)) errores.push("Elige una marca");

  const description = String(body.description || "").trim();
  if (!description) errores.push("Escribe una descripción");

  // Solo se aceptan imágenes subidas a tu cuenta de Cloudinary, en la carpeta del zapato
  const prefijo = `https://res.cloudinary.com/${cloudName}/image/upload/`;
  const imagenValida = (u) => typeof u === "string" && u.startsWith(prefijo) && u.includes(`/momentum-shoes/${uid}/`);
  if (!imagenValida(body.cover)) errores.push("Sube la foto principal");
  if (body.wallpaper && !imagenValida(body.wallpaper)) errores.push("La foto horizontal no es válida");
  const gallery = Array.isArray(body.image_gallery) ? body.image_gallery : [];
  if (gallery.length > 20 || gallery.some((u) => !imagenValida(u))) errores.push("Alguna foto de la galería no es válida");

  const tallas = [];
  const vistos = new Set();
  for (const t of Array.isArray(body.sizes) ? body.sizes : []) {
    const numero = Number(t.numero);
    const stock = Number(t.stock);
    if (!Number.isInteger(numero) || numero < 15 || numero > 50) errores.push(`Talla inválida: ${t.numero}`);
    else if (!Number.isInteger(stock) || stock < 0) errores.push(`El stock de la talla ${numero} debe ser 0 o más`);
    else if (vistos.has(numero)) errores.push(`La talla ${numero} está repetida`);
    else {
      vistos.add(numero);
      tallas.push({ numero, stock });
    }
  }
  if (!tallas.length) errores.push("Agrega al menos una talla");

  return {
    errores,
    uid,
    tallas,
    fila: {
      uid,
      name,
      price,
      discount,
      description,
      category_id: body.category_id,
      brand_id: body.brand_id,
      cover: body.cover,
      wallpaper: body.wallpaper || null,
      image_gallery: gallery,
    },
  };
}

async function cargarCatalogo(admin) {
  const [c, b] = await Promise.all([
    admin.from("categories").select("id, title, slug").order("order"),
    admin.from("brands").select("id, name, slug").order("name"),
  ]);
  if (c.error) throw c.error;
  if (b.error) throw b.error;
  return {
    listaCategorias: c.data,
    listaMarcas: b.data,
    categorias: new Map(c.data.map((x) => [x.id, x])),
    marcas: new Map(b.data.map((x) => [x.id, x])),
  };
}

async function guardarTallas(admin, productId, tallas) {
  const { error } = await admin
    .from("product_sizes")
    .upsert(tallas.map((t) => ({ product_id: productId, ...t })), { onConflict: "product_id,numero" });
  if (error) throw error;
  // Las tallas que se quitaron del formulario se eliminan (los pedidos guardan su propia copia)
  const numeros = tallas.map((t) => t.numero);
  const { error: e2 } = await admin
    .from("product_sizes")
    .delete()
    .eq("product_id", productId)
    .not("numero", "in", `(${numeros.join(",")})`);
  if (e2) throw e2;
}

export default async function handler(req, res) {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { admin } = ctx;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  try {
    if (req.method === "GET") {
      const [catalogo, productos] = await Promise.all([
        cargarCatalogo(admin),
        admin
          .from("products")
          .select(CAMPOS_LISTA)
          .order("created_at", { ascending: false })
          .order("numero", { referencedTable: "product_sizes", ascending: true }),
      ]);
      if (productos.error) throw productos.error;
      return res.status(200).json({
        productos: productos.data,
        categorias: catalogo.listaCategorias,
        marcas: catalogo.listaMarcas,
      });
    }

    if (req.method === "POST" || req.method === "PATCH") {
      if (!cloudName) return res.status(500).json({ error: "Falta CLOUDINARY_CLOUD_NAME en .env.local" });
      const catalogo = await cargarCatalogo(admin);
      const { errores, fila, tallas, uid } = validar(req.body || {}, { ...catalogo, cloudName });
      if (errores.length) return res.status(400).json({ error: errores.join(". ") });

      const { data: mismoUid } = await admin.from("products").select("id").eq("uid", uid).maybeSingle();

      if (req.method === "POST") {
        if (mismoUid) return res.status(409).json({ error: `Ya existe un zapato con la dirección "${uid}". Cambia el nombre o la dirección.` });
        const { data: creado, error } = await admin.from("products").insert(fila).select("id, uid").single();
        if (error) throw error;
        await guardarTallas(admin, creado.id, tallas);
        await refrescarTienda(res);
        return res.status(201).json({ producto: creado });
      }

      const id = req.body?.id;
      if (!id) return res.status(400).json({ error: "Falta el id del zapato" });
      if (mismoUid && mismoUid.id !== id) return res.status(409).json({ error: `Ya existe otro zapato con la dirección "${uid}"` });
      const { data: actualizado, error } = await admin.from("products").update(fila).eq("id", id).select("id, uid").single();
      if (error) throw error;
      await guardarTallas(admin, id, tallas);
      await refrescarTienda(res);
      return res.status(200).json({ producto: actualizado });
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (error) {
    console.error("[admin/productos]", error);
    return res.status(500).json({ error: "No se pudo guardar. Revisa la terminal para más detalles." });
  }
}
