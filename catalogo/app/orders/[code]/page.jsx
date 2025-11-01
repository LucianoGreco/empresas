// app/orders/[code]/page.jsx
import React from "react";

async function getOrder(code) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = await fetch(`${base}/api/orders/${encodeURIComponent(code)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const j = await res.json().catch(()=>({}));
    throw new Error(j?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export default async function OrderDetailPage({ params }) {
  const code = decodeURIComponent(params.code);
  const order = await getOrder(code);

  return (
    <main className="container" style={{ maxWidth: 800, margin: "24px auto" }}>
      <h1>Orden {order.code}</h1>
      <p><b>Estado:</b> {order.status}</p>
      <p><b>Total:</b> {(order.total/100).toLocaleString("es-AR", { style:"currency", currency:"ARS" })}</p>

      <h2>Ítems</h2>
      <ul>
        {(order.items || []).map(it => (
          <li key={it.id}>
            {it.title} — {(it.unitPrice/100).toLocaleString("es-AR", { style:"currency", currency:"ARS" })} x{it.quantity} = {(it.total/100).toLocaleString("es-AR", { style:"currency", currency:"ARS" })}
          </li>
        ))}
      </ul>

      <h2>Pagos</h2>
      {order.payments?.length ? (
        <ul>
          {order.payments.map(p => (
            <li key={p.id}>{p.provider} — {p.status} — {(p.amount/100).toLocaleString("es-AR", { style:"currency", currency:"ARS" })}</li>
          ))}
        </ul>
      ) : <p>Sin pagos registrados aún.</p>}
    </main>
  );
}
