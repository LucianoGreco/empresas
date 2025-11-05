// app/informes/page.jsx
"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  return res.json();
}

export default function InformesPage() {
  const [byPayment, setByPayment] = useState([]);
  const [byShipment, setByShipment] = useState([]);

  async function load() {
    // pagos por estado (pedimos varias y agregamos)
    const statuses = ["approved","pending","canceled"];
    const arr = await Promise.all(statuses.map(s => fetchJson(`/api/payments?status=${s}`)));
    const pay = statuses.map((s, i) => ({
      status: s,
      count: arr[i].length,
      amount: arr[i].reduce((a, b) => a + (b.amount || 0), 0),
    }));
    setByPayment(pay);

    // envíos por estado
    const s2 = ["pending","shipped","delivered","canceled"];
    const arr2 = await Promise.all(s2.map(s => fetchJson(`/api/shipments?status=${s}`)));
    const ship = s2.map((s, i) => ({ status: s, count: arr2[i].length }));
    setByShipment(ship);
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", fontFamily: "system-ui" }}>
      <h1>Informes</h1>

      <h2 style={{ marginTop: 12 }}>Pagos por estado</h2>
      <table cellPadding={8} style={{ borderCollapse: "collapse", border: "1px solid #e5e7eb", borderRadius: 8, width: "100%" }}>
        <thead><tr style={{ background:"#f8fafc" }}><th align="left">Estado</th><th align="right">Cantidad</th><th align="right">Total</th></tr></thead>
        <tbody>
          {byPayment.map(r => (
            <tr key={r.status}>
              <td>{r.status}</td><td align="right">{r.count}</td><td align="right">{r.amount.toLocaleString()}</td>
            </tr>
          ))}
          {byPayment.length === 0 && <tr><td colSpan={3} style={{ opacity:.6, padding: 16 }}>Sin datos</td></tr>}
        </tbody>
      </table>

      <h2 style={{ marginTop: 24 }}>Envíos por estado</h2>
      <table cellPadding={8} style={{ borderCollapse: "collapse", border: "1px solid #e5e7eb", borderRadius: 8, width: "100%" }}>
        <thead><tr style={{ background:"#f8fafc" }}><th align="left">Estado</th><th align="right">Cantidad</th></tr></thead>
        <tbody>
          {byShipment.map(r => (
            <tr key={r.status}><td>{r.status}</td><td align="right">{r.count}</td></tr>
          ))}
          {byShipment.length === 0 && <tr><td colSpan={2} style={{ opacity:.6, padding: 16 }}>Sin datos</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
