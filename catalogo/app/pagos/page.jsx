"use client";

import { useEffect, useState } from "react";
import { isAdminPage } from "@/lib/admin";
export const dynamic = "force-dynamic";

function fmtMoneyCents(cents = 0, currency = "ARS") {
  const n = Number(cents || 0) / 100;
  return n.toLocaleString("es-AR", { style: "currency", currency, maximumFractionDigits: 0 });
}

export default function PagosPage() {
  useEffect(() => { isAdminPage?.().catch(()=>{}); }, []);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (method) params.set("method", method);
    const res = await fetch(`/api/payments?${params.toString()}`, { cache: "no-store" });
    const json = await res.json();
    setRows(Array.isArray(json) ? json : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", fontFamily: "system-ui" }}>
      <h1>Pagos</h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0 16px" }}>
        <input placeholder="Buscar (orden, email, id...)" value={q} onChange={e=>setQ(e.target.value)} />
        <select value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">Estado</option>
          <option value="approved">approved</option>
          <option value="pending">pending</option>
          <option value="rejected">rejected</option>
          <option value="refunded">refunded</option>
          <option value="error">error</option>
        </select>
        <select value={method} onChange={e=>setMethod(e.target.value)}>
          <option value="">Proveedor</option>
          <option>mercadopago</option>
          <option>stripe</option>
          <option>transfer</option>
          <option>paypal</option>
          <option>qr</option>
        </select>
        <button onClick={load} disabled={loading}>{loading ? "Cargando..." : "Actualizar"}</button>
      </div>

      <div style={{ overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
        <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th align="left">Fecha</th>
              <th align="left">Orden</th>
              <th align="left">Proveedor</th>
              <th align="left">Estado</th>
              <th align="right">Importe</th>
              <th align="left">Moneda</th>
              <th align="left">Email comprador</th>
              <th align="left">Ref/Provider</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id}>
                <td>{new Date(p.createdAt).toLocaleString("es-AR")}</td>
                <td><a href={`/orders/${p.order?.code || ""}`} style={{ textDecoration: "underline" }}>{p.order?.code || "-"}</a></td>
                <td>{p.provider || p.method || "-"}</td>
                <td>{p.status}</td>
                <td align="right">{fmtMoneyCents(p.amount, p.currency || "ARS")}</td>
                <td>{p.currency || "ARS"}</td>
                <td>{p.order?.buyerEmail || "-"}</td>
                <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.providerRef || p.note || "-"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} style={{ opacity: .6, padding: 16 }}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
