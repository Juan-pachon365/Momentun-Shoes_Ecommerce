import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { finalPrice } from "@/lib/format";

const CartContext = createContext(null);
const STORAGE_KEY = "momentum-cart";

const itemKey = (productId, size) => `${productId}-${size}`;

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) setItems(saved);
    } catch {
      /* almacenamiento no disponible */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [items, ready]);

  /** product: { id, uid, name, cover, price, discount }, size: número, stock: disponible en esa talla */
  const addItem = (product, size, stock, quantity = 1) => {
    let added = true;
    setItems((prev) => {
      const key = itemKey(product.id, size);
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, stock);
        if (nextQty === existing.quantity) added = false;
        return prev.map((i) => (i.key === key ? { ...i, quantity: nextQty, stock } : i));
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          uid: product.uid,
          name: product.name,
          cover: product.cover,
          price: Number(product.price),
          discount: Number(product.discount || 0),
          size,
          stock,
          quantity: Math.min(quantity, stock),
        },
      ];
    });
    return added;
  };

  const updateQuantity = (key, quantity) => {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock || quantity)) } : i))
    );
  };

  // Actualiza precios y stock del carrito con los datos actuales de la base de datos.
  // Devuelve true si algo cambió (precio, stock o productos eliminados).
  const syncWithCatalog = (products) => {
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
    let changed = false;
    const next = items
      .map((i) => {
        const p = byId[i.productId];
        if (!p) {
          changed = true;
          return null;
        }
        const stock = p.product_sizes?.find((s) => s.numero === i.size)?.stock ?? 0;
        const quantity = Math.min(i.quantity, stock);
        if (Number(p.price) !== i.price || Number(p.discount || 0) !== i.discount || quantity !== i.quantity) {
          changed = true;
        }
        return {
          ...i,
          name: p.name,
          cover: p.cover,
          uid: p.uid,
          price: Number(p.price),
          discount: Number(p.discount || 0),
          stock,
          quantity,
        };
      })
      .filter((i) => i && i.quantity > 0);
    setItems(next);
    return changed;
  };

  const removeItem = (key) => setItems((prev) => prev.filter((i) => i.key !== key));
  const clearCart = () => setItems([]);

  const totals = useMemo(() => {
    const count = items.reduce((acc, i) => acc + i.quantity, 0);
    const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const total = items.reduce((acc, i) => acc + finalPrice(i.price, i.discount) * i.quantity, 0);
    return { count, subtotal, total, savings: subtotal - total };
  }, [items]);

  return (
    <CartContext.Provider value={{ items, ready, addItem, updateQuantity, removeItem, clearCart, syncWithCatalog, ...totals }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
