// components/CartContext.jsx
"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

const CartCtx = createContext(null);

// key base
const BASE_KEY = "carrito_ferreluc_v1";

// según usuario
function storageKeyFor(userEmail) {
  const email = (userEmail || "").trim().toLowerCase();
  return email ? `${BASE_KEY}::${email}` : `${BASE_KEY}::anon`;
}

export function CartProvider({ children }) {
  // usuario actual (puede ser null)
  const [user, setUser] = useState(null);
  const [readyUser, setReadyUser] = useState(false);

  // carrito
  const [items, setItems] = useState([]);
  const loadedRef = useRef(false);
  const currentKeyRef = useRef(storageKeyFor(null));

  // 1) cargar usuario logueado
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (!alive) return;
        setUser(j?.user || null);
      } catch {
        if (!alive) return;
        setUser(null);
      } finally {
        if (!alive) return;
        setReadyUser(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 2) cuando conozco al usuario -> cargo SU carrito
  useEffect(() => {
    if (!readyUser) return;
    const key = storageKeyFor(user?.email);
    currentKeyRef.current = key;
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      setItems(raw ? JSON.parse(raw) : []);
    } catch {
      setItems([]);
    }
    loadedRef.current = true;
  }, [readyUser, user]);

  // 3) guardar al cambiar items
  useEffect(() => {
    if (!loadedRef.current) return;
    const key = currentKeyRef.current;
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {}
  }, [items]);

  // 4) sync entre pestañas SOLO del key actual
  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key) return;
      const keyNow = currentKeyRef.current;
      if (e.key !== keyNow) return;
      if (e.newValue) {
        try {
          const next = JSON.parse(e.newValue);
          setItems(Array.isArray(next) ? next : []);
        } catch {}
      } else {
        setItems([]);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // helpers
  const addItem = (product, qty = 1) => {
    const id = product?.id || product?.codigo_flexxus;
    const price = Number(product?.venta ?? product?.precio_venta ?? 0);
    if (!id) return;
    const q = Math.max(1, Number(qty) || 1);

    setItems((prev) => {
      const i = prev.findIndex((r) => r.id === id);
      if (i === -1) {
        return [
          ...prev,
          {
            id,
            codigo_flexxus: product.codigo_flexxus || "",
            nombre: product.nombre_descripcion || "Producto",
            imagen: product.imagen || "/imagenes/sin_imagen.png",
            marca: product.marca || "",
            categoria: product.categoria || "",
            moneda: product.moneda || "ars",
            precio: price,
            qty: q,
          },
        ];
      } else {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + q };
        return next;
      }
    });
  };

  const updateQty = (id, qty) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, qty: Math.max(1, Number(qty) || 1) } : it
      )
    );
  };

  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  const clear = () => setItems([]);

  const count = useMemo(() => items.reduce((a, b) => a + b.qty, 0), [items]);
  const total = useMemo(
    () => items.reduce((a, b) => a + b.qty * b.precio, 0),
    [items]
  );

  const fmt = (n) => Number(n ?? 0).toLocaleString("es-AR");

  const value = {
    items,
    addItem,
    updateQty,
    removeItem,
    clear,
    count,
    total,
    fmt,
    user,
    readyUser,
  };

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
