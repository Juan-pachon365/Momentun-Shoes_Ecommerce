import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { finalPrice } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";

const CartContext = createContext(null);

// Cada cuenta tiene su propio carrito en el navegador; el visitante sin sesión tiene otro aparte.
const LEGACY_KEY = "momentum-cart"; // clave antigua, compartida por todas las cuentas
const GUEST = "invitado";
const storageKey = (owner) => `momentum-cart:${owner}`;

const itemKey = (productId, size) => `${productId}-${size}`;

function readCart(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function writeCart(key, items) {
  try {
    if (items.length) localStorage.setItem(key, JSON.stringify(items));
    else localStorage.removeItem(key);
  } catch {
    /* almacenamiento no disponible */
  }
}

// Suma al carrito de la cuenta lo que el visitante agregó antes de iniciar sesión
function mergeCarts(base, extra) {
  const result = base.map((i) => ({ ...i }));
  for (const item of extra) {
    const found = result.find((i) => i.key === item.key);
    if (found) {
      const stock = item.stock ?? found.stock ?? Infinity;
      found.quantity = Math.min(found.quantity + item.quantity, stock);
    } else {
      result.push(item);
    }
  }
  return result;
}

export function CartProvider({ children }) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [items, setItems] = useState([]);
  const [owner, setOwner] = useState(null);
  const [ready, setReady] = useState(false);

  // Cuando cambia la sesión (entrar, salir, crear cuenta) se carga el carrito de esa cuenta
  useEffect(() => {
    if (loading) return;
    const nextOwner = userId ?? GUEST;
    if (nextOwner === owner) return;

    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* almacenamiento no disponible */
    }

    let next = readCart(storageKey(nextOwner));
    if (userId) {
      const guestItems = readCart(storageKey(GUEST));
      if (guestItems.length) {
        next = mergeCarts(next, guestItems);
        writeCart(storageKey(GUEST), []);
      }
    }
    setItems(next);
    setOwner(nextOwner);
    setReady(true);
  }, [loading, userId, owner]);

  useEffect(() => {
    if (!ready || !owner) return;
    writeCart(storageKey(owner), items);
  }, [items, owner, ready]);

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