"use client";

import { useCart } from "@/components/CartContext";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const PROVIDERS = [
  { key: "mercadopago", label: "Mercado Pago (tarjeta, débito, efectivo)" },
  { key: "stripe", label: "Stripe (tarjetas, suscripciones)" },
  { key: "todopago", label: "Todo Pago (redirect)" },
  { key: "payu", label: "PayU (redirect)" },
  { key: "pagos360", label: "Pagos 360 (redirect)" },
  { key: "mobbex", label: "Mobbex (redirect)" },
  { key: "qr", label: "Código QR (redirect)" }
];

export default function CheckoutPage() {
  const { items, total, fmt, clear } = useCart();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("mercadopago");
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState([]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cartLines = useMemo(() => items.map(it => ({
    id: it.id,
    title: it.nombre,
    quantity: it.qty,
    unit_price: it.precio,
    currency: it.moneda || "ARS",
    image: it.imagen
  })), [items]);

  useEffect(() => {
    fetch("/api/checkout/methods", { cache: "no-store" })
      .then(r => r.json()).then(m => setMethods(m || []))
      .catch(() => setMethods([]));
  }, []);

  const onPay = async () => {
    if (!items.length) return;
    if (!email) { alert("Ingresá el email del comprador."); return; }

    setLoading(true);
    try {
      // 1) Crear orden pendiente (pre-checkout)
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: "cart:" + items.map(i => `${i.id}:${i.qty}`).join("|"),
          buyer: { email, name },
          items: items.map(it => ({
            sku: it.id,
            title: it.nombre,
            brand: it.marca,
            category: it.categoria,
            image: it.imagen,
            quantity: it.qty,
            unitPrice: it.precio
          })),
          currency: "ARS",
          shipping: { method: "retiro", cost: 0 }
        })
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order?.error || "No se pudo crear la orden");

      // Persisto el código para la pantalla de éxito
      try { localStorage.setItem("last_order_code", order.code); } catch {}

      // 2) Iniciar checkout con referencia a la orden creada
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider,
          buyer: { email, name },
          items: cartLines,
          meta: { orderId: order.id, orderCode: order.code }
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "checkout fail");
      if (data?.url) window.location.href = data.url;
      else alert("No se recibió URL de pago.");
    } catch (e) {
      alert(e.message || "Error iniciando el pago.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <main className="container">
        <h1>Checkout</h1>
        <p>Cargando…</p>
        <Link href="/" className="btn btn-primary">Ir al catálogo</Link>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="container">
        <h1>Checkout</h1>
        <p>Tu carrito está vacío.</p>
        <Link href="/" className="btn btn-primary">Ir al catálogo</Link>
      </main>
    );
  }

  const visibleProviders = PROVIDERS.filter(p => methods.includes(p.key));

  return (
    <main className="container">
      <header className="header">
        <h1>Checkout</h1>
      </header>

      <section className="cart" style={{gridTemplateColumns: "1fr 260px"}}>
        <div className="cart-table">
          {items.map((it) => (
            <div className="cart-row" key={it.id} style={{gridTemplateColumns: "1fr .6fr .4fr"}}>
              <div className="cart-col product">
                <img src={it.imagen} alt={it.nombre} className="cart-thumb" />
                <div className="cart-info">
                  <div className="title">{it.nombre}</div>
                  <div className="meta">
                    {it.marca} · {it.categoria} · x{it.qty}
                  </div>
                </div>
              </div>
              <div className="cart-col price">${fmt(it.precio)}</div>
              <div className="cart-col subtotal">${fmt(it.qty * it.precio)}</div>
            </div>
          ))}

          <div style={{borderTop:"1px solid var(--border)", padding:8}}>
            <div style={{display:"grid", gap:8}}>
              <input
                className="search-input"
                type="email"
                placeholder="Email del comprador"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
              />
              <input
                className="search-input"
                type="text"
                placeholder="Nombre del comprador (opcional)"
                value={name}
                onChange={(e)=>setName(e.target.value)}
              />
              <div>
                <label className="k" style={{display:"block", marginBottom:6}}>Método de pago</label>
                <div style={{display:"grid", gap:6}}>
                  {(visibleProviders.length ? visibleProviders : [{key:"mercadopago", label:"Mercado Pago"}]).map(p => (
                    <label key={p.key} style={{display:"flex", alignItems:"center", gap:8}}>
                      <input
                        type="radio"
                        name="provider"
                        value={p.key}
                        checked={provider===p.key}
                        onChange={()=>setProvider(p.key)}
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="cart-summary">
          <div className="sum-row">
            <span>Total</span>
            <strong>${fmt(total)}</strong>
          </div>
          <div className="sum-actions">
            <button disabled={loading} className="btn btn-primary" onClick={onPay}>
              {loading ? "Redirigiendo…" : "Pagar ahora"}
            </button>
          </div>
          <button className="link-back" onClick={clear}>Vaciar carrito</button>
          <Link href="/" className="link-back">← Seguir comprando</Link>
        </aside>
      </section>
    </main>
  );
}
