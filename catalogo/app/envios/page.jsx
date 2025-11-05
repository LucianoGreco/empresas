// app/envios/page.jsx
"use client";

import { useEffect, useState } from "react";
import { isAdminPage } from "@/lib/admin";
export const dynamic = "force-dynamic";

export default function EnviosPage() {
  useEffect(() => { isAdminPage?.().catch(()=>{}); }, []);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ orderCode: "", address: "", status: "pending", tracking: "", carrier: "", eta: "", email: "" });
  const [filter, setFilter] = useState({ q: "", status: "" });
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filter.q) p.set("q", filter.q);
    if (filter.status) p.set("status", filter.status);
    const res = await fetch(`/api/shipments?${p}`, { cache: "no-store" });
    setRows(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createShipment() {
    const res = await fetch("/api/shipments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    const j = await res.json();
    if (!res.ok) return alert(j?.error || "Error");
    setForm({ orderCode: "", address: "", status: "pending", tracking: "", carrier: "", eta: "", email: "" });
    load();
  }

  async function updateShipment(id, patch) {
    const res = await fetch("/api/shipments", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
    const j = await res.json();
    if (!res.ok) return alert(j?.error || "Error");
    load();
  }

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", fontFamily: "system-ui" }}>
      <h1>Envíos</h1>

      {/* Alta */}
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(6, 1fr)", margin: "8px 0 16px" }}>
        <input placeholder="Orden (code)" value={form.orderCode} onChange={e=>setForm({...form, orderCode:e.target.value})} />
        <input placeholder="Dirección" value={form.address} onChange={e=>setForm({...form, address:e.target.value})} />
        <select value={form.status} onChange={e=>setForm({...form, status:e.target.value})}>
          <option>pending</option><option>shipped</option><option>delivered</option><option>canceled</option>
        </select>
        <input placeholder="Tracking" value={form.tracking} onChange={e=>setForm({...form, tracking:e.target.value})} />
        <input placeholder="Carrier" value={form.carrier} onChange={e=>setForm({...form, carrier:e.target.value})} />
        <input placeholder="ETA (ISO o texto)" value={form.eta} onChange={e=>setForm({...form, eta:e.target.value})} />
        <input placeholder="Email cliente (opcional)" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} style={{ gridColumn: "span 3" }} />
        <button onClick={createShipment} style={{ gridColumn: "span 3" }}>Crear envío</button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input placeholder="Buscar..." value={filter.q} onChange={e=>setFilter({...filter, q:e.target.value})} />
        <select value={filter.status} onChange={e=>setFilter({...filter, status:e.target.value})}>
          <option value="">Estado</option>
          <option>pending</option><option>shipped</option><option>delivered</option><option>canceled</option>
        </select>
        <button onClick={load} disabled={loading}>{loading ? "..." : "Actualizar"}</button>
      </div>

      {/* Tabla */}
      <div style={{ overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
        <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th align="left">Fecha</th>
              <th align="left">Orden</th>
              <th align="left">Dirección</th>
              <th align="left">Estado</th>
              <th align="left">Tracking</th>
              <th align="left">Carrier</th>
              <th align="left">ETA</th>
              <th align="left">Email</th>
              <th align="left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => (
              <tr key={s.id}>
                <td style={{ whiteSpace:"nowrap" }}>{new Date(s.createdAt).toLocaleString()}</td>
                <td><a href={`/orders/${s.orderCode}`} style={{ textDecoration: "underline" }}>{s.orderCode}</a></td>
                <td>{s.address}</td>
                <td>{s.status}</td>
                <td>{s.tracking || "-"}</td>
                <td>{s.carrier || "-"}</td>
                <td>{s.eta || "-"}</td>
                <td>{s.email || "-"}</td>
                <td>
                  {s.status !== "shipped" && <button onClick={()=>updateShipment(s.id, { status:"shipped" })}>Marcar enviado</button>}
                  {s.status !== "delivered" && <button onClick={()=>updateShipment(s.id, { status:"delivered" })}>Marcar entregado</button>}
                  {s.status !== "canceled" && <button onClick={()=>updateShipment(s.id, { status:"canceled" })}>Cancelar</button>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} style={{ opacity:.6, padding: 16 }}>Sin envíos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
