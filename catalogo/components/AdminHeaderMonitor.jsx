"use client";
import { useEffect, useState } from "react";
import styled from "styled-components";

const Wrap = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;
const Badge = styled.span`
  display: inline-flex;
  gap: 6px;
  align-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12.5px;
  background: #fff;
`;
const Strip = styled.div`
  display: none;
  gap: 6px;
  align-items: center;
  margin-left: 8px;
  @media (min-width: 920px) {
    display: flex;
  }
`;
const EventPill = styled.span`
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 11.5px;
  border: 1px solid #e5e7eb;
  background: ${({ ok }) => (ok ? "#ecfdf5" : "#fef2f2")};
  color: #111;
`;

function cents(n) {
  return typeof n === "number" ? (n / 100).toFixed(2) : "0.00";
}

export default function AdminHeaderMonitor() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    const fetcher = async () => {
      try {
        const r = await fetch("/api/admin/overview", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        setData(j?.ok ? j : null);
      } catch {
        if (!alive) return;
        setData(null);
      }
    };
    fetcher();
    const id = setInterval(fetcher, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!data) return null;

  const t = data.totals || { orders: 0, payments: 0, users: 0, pendingOrders: 0 };
  const events = data.lastPayments || [];

  return (
    <Wrap>
      <Badge>Órdenes: <strong>{t.orders}</strong></Badge>
      <Badge>Pagos: <strong>{t.payments}</strong></Badge>
      <Badge>Pendientes: <strong>{t.pendingOrders}</strong></Badge>
      <Badge>Usuarios: <strong>{t.users}</strong></Badge>

      <Strip>
        {events.map((p) => (
          <EventPill key={p.id} ok={p.status === "approved"} title={`${p.provider} ${p.status}`}>
            {new Date(p.createdAt).toLocaleTimeString()} · {p.order?.code || "—"} · {p.currency} {cents(p.amount)}
          </EventPill>
        ))}
      </Strip>
    </Wrap>
  );
}
