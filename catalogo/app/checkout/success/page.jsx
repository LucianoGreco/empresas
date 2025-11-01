"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function useOrderCode() {
  const [code, setCode] = useState("");
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const fromQuery = url.searchParams.get("order");
      if (fromQuery) setCode(fromQuery);
      else {
        const last = localStorage.getItem("last_order_code");
        if (last) setCode(last);
      }
    } catch {}
  }, []);
  return code;
}

export default function SuccessPage(){
  const code = useOrderCode();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!code) return;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(code)}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "error");
        setOrder(data);
      } catch (e) {
        setErr(e?.message || "No se pudo leer la orden");
      }
    })();
  }, [code]);

  if (!code) {
    return (
      <main className="container">
        <h1>Pago recibido ✅</h1>
        <p>Gracias. Podés cerrar esta pestaña.</p>
        <p style={{color:"#6b7280"}}>No se detectó código de orden.</p>
        <Link href="/" className="btn btn-primary">Ir al catálogo</Link>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Pago recibido ✅</h1>
      <p>Orden: <strong>{code}</strong></p>
      {err && <p style={{color:"#ef4444"}}>{err}</p>}
      {!order && !err && <p>Cargando datos reales de la orden…</p>}
      {order && (
        <>
          <div style={{background:"#fff", border:"1px solid var(--border)", borderRadius:10, padding:10, marginTop:8}}>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
              <div><span className="k">Estado</span><div><strong>{order.status}</strong></div></div>
              <div><span className="k">Total</span><div><strong>${Number(order.total).toLocaleString("es-AR")}</strong></div></div>
              <div><span className="k">Email</span><div>{order.buyerEmail}</div></div>
              <div><span className="k">Fecha</span><div>{new Date(order.createdAt).toLocaleString("es-AR")}</div></div>
            </div>

            <h3 style={{marginTop:12}}>Ítems</h3>
            <div className="list">
              {order.items.map(it => (
                <div key={it.id} className="list-item" style={{gridTemplateColumns:"1fr auto auto"}}>
                  <div className="list-main">
                    <div className="list-title">{it.title}</div>
                    <div className="list-meta">
                      <span className="k">SKU</span><span className="v">{it.sku}</span>
                      <span className="k">Marca</span><span className="v">{it.brand || ""}</span>
                      <span className="k">Cat.</span><span className="v">{it.category || ""}</span>
                    </div>
                  </div>
                  <div className="list-price">${Number(it.unitPrice).toLocaleString("es-AR")}</div>
                  <div className="list-price">x{it.quantity} = ${Number(it.total).toLocaleString("es-AR")}</div>
                </div>
              ))}
            </div>

            <h3 style={{marginTop:12}}>Pagos</h3>
            <div className="list">
              {order.payments.length === 0 && <div className="list-item"><div>Sin pagos registrados aún.</div></div>}
              {order.payments.map(p => (
                <div key={p.id} className="list-item" style={{gridTemplateColumns:"1fr auto auto"}}>
                  <div className="list-main">
                    <div className="list-title">{p.provider} · {p.status}</div>
                    <div className="list-meta">
                      <span className="k">Ref</span><span className="v">{p.providerRef || "-"}</span>
                      <span className="k">Evento</span><span className="v">{p.eventId || "-"}</span>
                    </div>
                  </div>
                  <div className="list-price">{p.currency} ${Number(p.amount).toLocaleString("es-AR")}</div>
                  <div className="list-price">{new Date(p.createdAt).toLocaleString("es-AR")}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Link href="/" className="btn btn-primary" style={{marginTop:10}}>Volver al catálogo</Link>
    </main>
  );
}
