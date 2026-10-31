import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "@/lib/apiClient";
import { subirImagen } from "@/lib/adminUpload";
import { cdn } from "@/lib/format";
import { useToast } from "@/contexts/ToastContext";
import { IconClose, IconPlus } from "@/components/Icons";
import styles from "./Admin.module.scss";

const slugify = (t) =>
  String(t || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const VACIO = { name: "", uid: "", brand_id: "", category_id: "", price: "", discount: "0", description: "" };
const imgDeUrl = (url) => (url ? { url, preview: cdn(url, 500) } : null);
const imgDeArchivo = (file) => ({ file, preview: URL.createObjectURL(file) });

export function ProductoForm({ editarUid }) {
  const router = useRouter();
  const { notify } = useToast();
  const [catalogo, setCatalogo] = useState(null); // { productos, categorias, marcas }
  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [uidManual, setUidManual] = useState(false);
  const [tallas, setTallas] = useState([]);
  const [rango, setRango] = useState({ desde: "", hasta: "", stock: "5" });
  const [cover, setCover] = useState(null);
  const [wallpaper, setWallpaper] = useState(null);
  const [galeria, setGaleria] = useState([]);
  const [error, setError] = useState("");
  const [progreso, setProgreso] = useState("");
  const [guardando, setGuardando] = useState(false);
  const cargado = useRef(null);

  useEffect(() => {
    apiFetch("/api/admin/productos")
      .then((d) => setCatalogo(d))
      .catch((e) => setError(e.message));
  }, []);

  // Llenar el formulario al editar (o limpiarlo al pasar a "nuevo")
  useEffect(() => {
    if (!catalogo) return;
    const clave = editarUid || "__nuevo__";
    if (cargado.current === clave) return;
    cargado.current = clave;
    setError("");
    if (!editarUid) {
      setOriginal(null);
      setForm(VACIO);
      setUidManual(false);
      setTallas([]);
      setCover(null);
      setWallpaper(null);
      setGaleria([]);
      return;
    }
    const p = catalogo.productos.find((x) => x.uid === editarUid);
    if (!p) {
      setError(`No existe un zapato con la dirección "${editarUid}"`);
      return;
    }
    setOriginal(p);
    setForm({
      name: p.name.trim(),
      uid: p.uid,
      brand_id: p.brand_id || "",
      category_id: p.category_id || "",
      price: String(Number(p.price)),
      discount: String(Number(p.discount || 0)),
      description: p.description || "",
    });
    setTallas(p.product_sizes.map((s) => ({ numero: String(s.numero), stock: String(s.stock) })));
    setCover(imgDeUrl(p.cover));
    setWallpaper(imgDeUrl(p.wallpaper));
    setGaleria((p.image_gallery || []).map(imgDeUrl));
  }, [catalogo, editarUid]);

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => {
      const n = { ...f, [k]: v };
      if (k === "name" && !uidManual && !original) n.uid = slugify(v);
      return n;
    });
  };

  const agregarRango = () => {
    const d = parseInt(rango.desde, 10);
    const h = parseInt(rango.hasta || rango.desde, 10);
    const st = parseInt(rango.stock, 10);
    if (!Number.isInteger(d) || !Number.isInteger(h) || h < d || h - d > 30 || !Number.isInteger(st) || st < 0) {
      notify("Revisa el rango de tallas y el stock", "danger");
      return;
    }
    setTallas((prev) => {
      const mapa = new Map(prev.map((t) => [t.numero, t]));
      for (let n = d; n <= h; n++) mapa.set(String(n), { numero: String(n), stock: String(st) });
      return [...mapa.values()].sort((a, b) => Number(a.numero) - Number(b.numero));
    });
  };

  const onGuardar = async (e) => {
    e.preventDefault();
    setError("");
    const uid = original ? original.uid : slugify(form.uid || form.name);
    const errores = [];
    if (!form.name.trim()) errores.push("Escribe el nombre");
    if (!uid) errores.push("Falta la dirección (uid)");
    if (!original && catalogo.productos.some((p) => p.uid === uid)) errores.push(`Ya existe un zapato con la dirección "${uid}"`);
    if (!form.brand_id) errores.push("Elige la marca");
    if (!form.category_id) errores.push("Elige la categoría");
    if (!/^\d+$/.test(form.price) || Number(form.price) < 1500) errores.push("El precio debe ser un número entero de 1.500 o más, sin puntos");
    if (!form.description.trim()) errores.push("Escribe la descripción");
    if (!cover) errores.push("Sube la foto principal");
    const sizes = tallas.map((t) => ({ numero: Number(t.numero), stock: Number(t.stock) }));
    if (!sizes.length) errores.push("Agrega al menos una talla");
    if (sizes.some((s) => !Number.isInteger(s.numero) || !Number.isInteger(s.stock) || s.stock < 0)) errores.push("Revisa los números de talla y stock");
    if (errores.length) {
      setError(errores.join(". "));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setGuardando(true);
    try {
      // 1. Subir fotos nuevas a Cloudinary
      const pendientes = [cover, wallpaper, ...galeria].filter((i) => i?.file).length;
      let hechas = 0;
      const subir = async (img, nombre) => {
        if (!img) return null;
        if (!img.file) return img.url;
        hechas += 1;
        setProgreso(`Subiendo foto ${hechas} de ${pendientes}...`);
        return subirImagen(img.file, uid, nombre);
      };
      const coverUrl = await subir(cover, "cover");
      const wallUrl = await subir(wallpaper, "wallpaper");
      // Las fotos nuevas de la galería usan números que no estén ocupados por las que se conservan
      const usados = new Set(
        galeria.filter((g) => g.url).map((g) => Number((g.url.match(/gallery-(\d+)/) || [])[1])).filter(Boolean)
      );
      const libre = () => {
        for (let i = 1; i <= 20; i++) if (!usados.has(i)) { usados.add(i); return i; }
        throw new Error("Máximo 20 fotos en la galería");
      };
      const galeriaUrls = [];
      for (const g of galeria) galeriaUrls.push(g.url || (await subir(g, `gallery-${libre()}`)));

      // 2. Guardar en Supabase
      setProgreso("Guardando el zapato...");
      const body = {
        ...(original && { id: original.id }),
        uid,
        name: form.name.trim().toUpperCase(),
        brand_id: form.brand_id,
        category_id: form.category_id,
        price: Number(form.price),
        discount: Number(form.discount || 0),
        description: form.description.trim(),
        cover: coverUrl,
        wallpaper: wallUrl,
        image_gallery: galeriaUrls,
        sizes,
      };
      await apiFetch("/api/admin/productos", { method: original ? "PATCH" : "POST", body });
      notify(original ? "Zapato actualizado" : "Zapato creado", "success");
      router.push("/admin?tab=stock");
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setProgreso("");
    setGuardando(false);
  };

  if (!catalogo && !error) return <div className="spinner" />;
  if (!catalogo) return <div className="form-error">{error}</div>;

  return (
    <form onSubmit={onGuardar} noValidate>
      {original && <h2 className={styles.sectionTitle}>{original.name.trim()}</h2>}
      {error && <div className="form-error">{error}</div>}

      <div className={styles.formGrid}>
        <div className="card">
          <div className={styles.formSection}>
            <h3>Datos</h3>
            <div className="field">
              <label htmlFor="z-name">Nombre</label>
              <input id="z-name" value={form.name} onChange={set("name")} placeholder="VANS OLD SKOOL" />
            </div>
            <div className="field">
              <label htmlFor="z-uid">Dirección en la tienda</label>
              <input
                id="z-uid"
                value={original ? original.uid : form.uid}
                disabled={!!original}
                onChange={(e) => {
                  setUidManual(true);
                  setForm((f) => ({ ...f, uid: slugify(e.target.value) }));
                }}
              />
              <span className={styles.uidHint}>
                Se verá en <code>/producto/{(original ? original.uid : form.uid) || "..."}</code>
                {original ? ". No se puede cambiar después de creado." : ". Se arma sola con el nombre."}
              </span>
            </div>
            <div className={styles.fieldRow3}>
              <div className="field">
                <label htmlFor="z-brand">Marca</label>
                <select id="z-brand" value={form.brand_id} onChange={set("brand_id")}>
                  <option value="">Elige una marca</option>
                  {catalogo.marcas.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="z-cat">Categoría</label>
                <select id="z-cat" value={form.category_id} onChange={set("category_id")}>
                  <option value="">Elige una categoría</option>
                  {catalogo.categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="z-price">Precio (COP)</label>
                <input id="z-price" inputMode="numeric" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value.replace(/\D/g, "") }))} placeholder="85000" />
              </div>
              <div className="field">
                <label htmlFor="z-disc">Descuento (%)</label>
                <input id="z-disc" type="number" min="0" max="100" value={form.discount} onChange={set("discount")} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="z-desc">Descripción</label>
              <textarea id="z-desc" className={styles.textarea} value={form.description} onChange={set("description")} />
            </div>
          </div>

          <div className={styles.formSection}>
            <h3>Tallas y stock</h3>
            {tallas.length === 0 && <p className="muted">Todavía no hay tallas. Agrega un rango abajo.</p>}
            <div className={styles.sizeEditor}>
              {tallas.map((t, i) => (
                <div key={t.numero} className={styles.sizeEdit}>
                  <span>T</span>
                  <input
                    aria-label="Talla"
                    inputMode="numeric"
                    value={t.numero}
                    onChange={(e) => setTallas((prev) => prev.map((x, j) => (j === i ? { ...x, numero: e.target.value.replace(/\D/g, "") } : x)))}
                  />
                  <span>Stock</span>
                  <input
                    aria-label={`Stock talla ${t.numero}`}
                    inputMode="numeric"
                    value={t.stock}
                    onChange={(e) => setTallas((prev) => prev.map((x, j) => (j === i ? { ...x, stock: e.target.value.replace(/\D/g, "") } : x)))}
                  />
                  <button type="button" aria-label={`Quitar talla ${t.numero}`} onClick={() => setTallas((prev) => prev.filter((_, j) => j !== i))}>
                    <IconClose />
                  </button>
                </div>
              ))}
            </div>
            <div className={styles.rangeAdd}>
              Agregar tallas de
              <input aria-label="Desde la talla" inputMode="numeric" value={rango.desde} onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))} placeholder="36" />
              a
              <input aria-label="Hasta la talla" inputMode="numeric" value={rango.hasta} onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))} placeholder="42" />
              con stock
              <input aria-label="Stock de cada talla" inputMode="numeric" value={rango.stock} onChange={(e) => setRango((r) => ({ ...r, stock: e.target.value }))} />
              <button type="button" className="btn btn-outline" onClick={agregarRango}>
                <IconPlus /> Agregar
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className={styles.formSection}>
            <h3>Fotos</h3>
            <ImageSlot label="Foto principal" hint="Obligatoria · cuadrada" img={cover} onChange={setCover} square />
            <ImageSlot label="Foto horizontal" hint="Opcional · 16:9" img={wallpaper} onChange={setWallpaper} />

            <div className={styles.imageSlot}>
              <div className={styles.slotHead}>
                <strong>Galería</strong>
                <span>Opcional · hasta 20 fotos</span>
              </div>
              {galeria.length > 0 && (
                <div className={styles.gallery}>
                  {galeria.map((g, i) => (
                    <div key={g.preview} className={styles.preview}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.preview} alt={`Foto ${i + 1} de la galería`} />
                      {g.file && <span className={styles.newTag}>Nueva</span>}
                      <button type="button" className={styles.removeImg} aria-label={`Quitar foto ${i + 1}`} onClick={() => setGaleria((prev) => prev.filter((_, j) => j !== i))}>
                        <IconClose />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <span className={`btn btn-outline ${styles.fileBtn}`}>
                <IconPlus /> Agregar fotos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  aria-label="Agregar fotos a la galería"
                  onChange={(e) => {
                    const files = [...e.target.files];
                    setGaleria((prev) => [...prev, ...files.map(imgDeArchivo)].slice(0, 20));
                    e.target.value = "";
                  }}
                />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.formActions}>
        <button className="btn btn-primary" disabled={guardando}>
          {guardando ? "Guardando..." : original ? "Guardar cambios" : "Crear zapato"}
        </button>
        <button type="button" className="btn btn-ghost" disabled={guardando} onClick={() => router.push("/admin?tab=stock")}>
          Cancelar
        </button>
        {progreso && <span className={styles.progressText}>{progreso}</span>}
      </div>
    </form>
  );
}

function ImageSlot({ label, hint, img, onChange, square }) {
  return (
    <div className={styles.imageSlot}>
      <div className={styles.slotHead}>
        <strong>{label}</strong>
        <span>{hint}</span>
      </div>
      {img && (
        <div className={`${styles.preview} ${square ? styles.previewSquare : styles.previewWide}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.preview} alt={label} />
          {img.file && <span className={styles.newTag}>Nueva</span>}
          <button type="button" className={styles.removeImg} aria-label={`Quitar ${label.toLowerCase()}`} onClick={() => onChange(null)}>
            <IconClose />
          </button>
        </div>
      )}
      <span className={`btn btn-outline ${styles.fileBtn}`}>
        {img ? "Cambiar foto" : "Elegir foto"}
        <input
          type="file"
          accept="image/*"
          aria-label={label}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onChange(imgDeArchivo(f));
            e.target.value = "";
          }}
        />
      </span>
    </div>
  );
}
