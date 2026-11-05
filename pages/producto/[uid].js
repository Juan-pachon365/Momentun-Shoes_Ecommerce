import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getProductByUid, getProducts } from "@/lib/catalog";
import { cdn, totalStock } from "@/lib/format";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import { Seo } from "@/components/Seo";
import { Price } from "@/components/Price";
import { WishlistButton } from "@/components/WishlistButton";
import { ProductGrid } from "@/components/ProductGrid";
import { IconBag, IconMinus, IconPlus, IconShield, IconTruck } from "@/components/Icons";
import styles from "@/styles/Product.module.scss";

export default function ProductPage({ product, related }) {
  const { addItem, items } = useCart();
  const { notify } = useToast();

  const images = useMemo(
    () => [product.cover, ...(product.image_gallery || [])].filter(Boolean),
    [product.cover, product.image_gallery]
  );
  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);

  useEffect(() => {
    setActiveImage(0);
    setSize(null);
    setQuantity(1);
    setSizeError(false);
  }, [product.id]);

  const sizes = product.product_sizes || [];
  const selected = sizes.find((s) => s.numero === size);
  const inCart = items.find((i) => i.productId === product.id && i.size === size)?.quantity || 0;
  const available = selected ? Math.max(0, selected.stock - inCart) : 0;
  const soldOut = totalStock(product) === 0;

  const handleAdd = () => {
    if (!selected) {
      setSizeError(true);
      return;
    }
    if (available <= 0) {
      notify("Ya tienes en el carrito todas las unidades disponibles de esta talla", "danger");
      return;
    }
    addItem(product, selected.numero, selected.stock, Math.min(quantity, available));
    notify(`${product.name.trim()} (talla ${selected.numero}) agregado al carrito`, "success");
    setQuantity(1);
  };

  return (
    <div className="container page">
      <Seo title={product.name.trim()} description={product.description?.slice(0, 150)} />

      <nav className={styles.breadcrumb} aria-label="Ruta">
        <Link href="/">Inicio</Link>
        <span>/</span>
        <Link href="/catalogo">Catálogo</Link>
        {product.category && (
          <>
            <span>/</span>
            <Link href={`/catalogo?categoria=${product.category.slug}`}>{product.category.title}</Link>
          </>
        )}
      </nav>

      <div className={styles.layout}>
        <div className={styles.gallery}>
          <div className={styles.mainImage}>
            {images[activeImage] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cdn(images[activeImage], 1100)} alt={product.name} />
            )}
            <div className={styles.wishFloat}>
              <WishlistButton productId={product.id} />
            </div>
          </div>
          {images.length > 1 && (
            <div className={styles.thumbs}>
              {images.map((img, i) => (
                <button
                  key={img}
                  className={`${styles.thumb} ${i === activeImage ? styles.thumbActive : ""}`}
                  onClick={() => setActiveImage(i)}
                  aria-label={`Ver imagen ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cdn(img, 200)} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.info}>
          <span className="eyebrow">
            {[product.brand?.name, product.category?.title].filter(Boolean).join(" · ")}
          </span>
          <h1 className={styles.name}>{product.name.trim()}</h1>
          <Price price={product.price} discount={product.discount} size="lg" />

          <div className={styles.sizeBlock}>
            <div className={styles.sizeHead}>
              <h2>Elige tu talla</h2>
              {selected && selected.stock > 0 && selected.stock <= 3 && (
                <span className={styles.lowStock}>¡Quedan {selected.stock}!</span>
              )}
            </div>
            <div className={styles.sizes} role="radiogroup" aria-label="Talla">
              {sizes.map((s) => (
                <button
                  key={s.id}
                  role="radio"
                  aria-checked={size === s.numero}
                  disabled={s.stock <= 0}
                  className={`${styles.size} ${size === s.numero ? styles.sizeActive : ""}`}
                  onClick={() => {
                    setSize(s.numero);
                    setQuantity(1);
                    setSizeError(false);
                  }}
                  title={s.stock <= 0 ? "Agotada" : `${s.stock} disponibles`}
                >
                  {s.numero}
                </button>
              ))}
            </div>
            {sizeError && <p className={styles.error}>Selecciona una talla para continuar</p>}
          </div>

          {!soldOut && (
            <div className={styles.buy}>
              <div className={styles.qty} aria-label="Cantidad">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Disminuir cantidad" disabled={quantity <= 1}>
                  <IconMinus />
                </button>
                <span>{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => (selected ? Math.min(available || 1, q + 1) : q + 1))}
                  aria-label="Aumentar cantidad"
                  disabled={selected && quantity >= available}
                >
                  <IconPlus />
                </button>
              </div>
              <button className={`btn btn-primary ${styles.addBtn}`} onClick={handleAdd}>
                <IconBag /> Agregar al carrito
              </button>
            </div>
          )}
          {soldOut && <p className={styles.soldOut}>Producto agotado en todas las tallas</p>}

          <WishlistButton productId={product.id} variant="inline" />

          <ul className={styles.perks}>
            <li>
              <IconTruck /> Envíos a toda Colombia: eliges la transportadora al pagar
            </li>
            <li>
              <IconShield /> Pago seguro con Wompi: tarjeta, PSE, Nequi y más
            </li>
          </ul>

          {product.description && (
            <div className={styles.description}>
              <h2>Descripción</h2>
              <p>{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className={styles.related}>
          <h2>También te puede gustar</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const product = await getProductByUid(params.uid).catch(() => null);
  if (!product) return { notFound: true };

  let related = [];
  try {
    related = product.category
      ? (await getProducts({ categoria: product.category.slug, limit: 5 })).filter((p) => p.id !== product.id).slice(0, 4)
      : [];
  } catch {
    related = [];
  }

  return { props: { product, related } };
}
