"use client";

import { useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

function currency(amount = 0, cur = "ARS") {
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: cur }).format((amount || 0) / 100);
  } catch {
    return `${(amount || 0) / 100} ${cur}`;
  }
}

export default function SuccessPage() {
  const [loading, setLoading] = useState(true);
  const [reconciled, setReconciled] = useState(false);
  const [payments, setPayments] = useState([]);

  // Lee params de la URL que manda MP en el back_url
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const orderCode = params.get("order") || params.get("external_reference") || "";
  const paymentId = params.get("payment_id") || params.get("collection_id") || "";
  const mpStatus = params.get("status") || "";

  async function reconcileIfNeeded() {
    // Si MP te devolvió un payment_id, reconciliamos (por si el webhook no llegó)
    if (!paymentId) return;
    try {
      await fetch(`/api/payments/reconcile?payment_id=${encodeURIComponent(paymentId)}`, { cache: "no-store" });
      setReconciled(true);
    } catch {
      // ignoramos; igual mostramos lo que tengamos
    }
  }

  async function loadPayments() {
    if (!orderCode) return;
    setLoading(true);
    const res = await fetch(`/api/payments?order=${encodeURIComponent(orderCode)}`, { cache: "no-store" });
    const rows = await res.json().catch(() => []);
    setPayments(Array.isArray(rows) ? rows : []);
    setLoading(false);
  }

  useEffect(() => {
    // 1) Intento de reconciliar
    reconcileIfNeeded().then(() => {
      // 2) Carga inicial
      loadPayments();
      // 3) Breve re-poll (por si el webhook entra segundos después)
      const t1 = setTimeout(loadPayments, 2000);
      const t2 = setTimeout(loadPayments, 5000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resumen rápido de pagos
  const summary = useMemo(() => {
    if (!payments.length) return { approved: 0, total: 0, currency: "ARS" };
    const currency = payments[0]?.currency || "ARS";
    const approved = payments.filter(p => p.status === "approved").reduce((a, b) => a + (b.amount || 0), 0);
    const total = payments.reduce((a, b) => a + (b.amount || 0), 0);
    return { approved, total, currency };
  }, [payments]);

  const hasApproved = summary.approved > 0;

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 4 }}>{hasApproved ? "Pago recibido ✅" : "Operación registrada"}</h1>
      {orderCode && <p style={{ marginTop: 0, color: "#475569" }}>Orden: <strong>{orderCode}</strong></p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, margin: "16px 0 24px" }}>
        <Card title="Estado">
          <b style={{ color: hasApproved ? "#059669" : "#b45309" }}>
            {hasApproved ? "paid" : (mpStatus || "pending")}
          </b>
          {reconciled && <small style={{ display: "block", color: "#6b7280", marginTop: 6 }}>Confirmado por reconciliación</small>}
        </Card>
        <Card title="Monto aprobado">{currency(summary.approved, summary.currency)}</Card>
        <Card title="Pagos totales">{currency(summary.total, summary.currency)}</Card>
      </div>

      <section style={{ marginTop: 8 }}>
        <h2 style={{ fontSize: 18, margin: "8px 0" }}>Pagos</h2>
        <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th align="left">Fecha</th>
                <th align="left">Proveedor</th>
                <th align="left">Estado</th>
                <th align="right">Importe</th>
                <th align="left">Moneda</th>
                <th align="left">Ref</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td>{new Date(p.createdAt).toLocaleString()}</td>
                  <td>{p.provider || "-"}</td>
                  <td style={{ color: p.status === "approved" ? "#059669" : p.status === "rejected" ? "#dc2626" : "#92400e" }}>
                    {p.status}
                  </td>
                  <td align="right">{currency(p.amount, p.currency)}</td>
                  <td>{p.currency}</td>
                  <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.providerRef || p.eventId}
                  </td>
                </tr>
              ))}
              {!loading && payments.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 16, color: "#6b7280" }}>Sin pagos registrados aún.</td></tr>
              )}
              {loading && (
                <tr><td colSpan={6} style={{ padding: 16, color: "#6b7280" }}>Cargando…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div style={{ marginTop: 24 }}>
        <a href="/" style={{ color: "#2563eb", textDecoration: "underline" }}>Volver al catálogo</a>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 16 }}>{children}</div>
    </div>
  );
}
