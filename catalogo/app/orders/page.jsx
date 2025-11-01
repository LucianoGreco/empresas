// app/orders/page.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function fmtMoney(cents = 0) {
  const n = Number(cents || 0) / 100;
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

export default function OrdersPage() {
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [me, setMe] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  // saber si soy admin
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rMe = await fetch("/api/auth/me", { cache: "no-store" });
        const jMe = await rMe.json().catch(() => ({}));
        const rAdm = await fetch("/api/admin/whoami", { cache: "no-store" });
        const jAdm = await rAdm.json().catch(() => ({}));
        if (!alive) return;
        setMe(jMe?.user || null);
        const adminByRole = (jMe?.user?.role || "") === "admin";
        setIsAdmin(adminByRole || !!jAdm?.admin);
      } catch {
        if (!alive) return;
        setMe(null);
        setIsAdmin(false);
      } finally {
        if (!alive) return;
        setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function loadByMe() {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/orders?me=1", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Error");
      setOrders(j.orders || []);
      setEmail(j.email || "");
    } catch (e) {
      setErr(e.message || "Error");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadByEmail() {
    if (!email.trim()) {
      setErr("Ingresá un email");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(
        `/api/orders?email=${encodeURIComponent(email.trim())}`,
        { cache: "no-store" }
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Error");
      setOrders(j.orders || []);
    } catch (e) {
      setErr(e.message || "Error");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <main className="container" style={{ maxWidth: 960, margin: "24px auto" }}>
        <p>Cargando…</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container" style={{ maxWidth: 720, margin: "24px auto" }}>
        <h1>Órdenes</h1>
        <p>No tenés permiso para ver esta sección.</p>
        <p>
          <Link href="/">Volver al catálogo</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="container" style={{ maxWidth: 960, margin: "24px auto" }}>
      <h1>Órdenes (últimas 10)</h1>

      <section style={{ display: "grid", gap: 12, margin: "16px 0 24px" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={loadByMe}>
            Usar mi sesión
          </button>
          <input
            type="email"
            placeholder="o ingresá un email (solo admin)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: 8,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              flex: "1 1 240px",
            }}
          />
          <button className="btn" onClick={loadByEmail}>
            Buscar por email
          </button>
        </div>
        {loading && <div>Cargando...</div>}
        {err && <div style={{ color: "crimson" }}>{err}</div>}
      </section>

      <section>
        {orders.length === 0 ? (
          <p>No hay órdenes.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {orders.map((o) => (
              <article
                key={o.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <header
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <strong>
                    Orden:{" "}
                    <Link href={`/orders/${encodeURIComponent(o.code)}`}>
                      {o.code}
                    </Link>
                  </strong>
                  <span>{new Date(o.createdAt).toLocaleString("es-AR")}</span>
                </header>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    flexWrap: "wrap",
                    marginTop: 6,
                  }}
                >
                  <span>
                    <b>Estado:</b> {o.status}
                  </span>
                  <span>
                    <b>Total:</b> {fmtMoney(o.total)}
                  </span>
                  <span>
                    <b>Email:</b> {o.buyerEmail}
                  </span>
                  <span>
                    <b>Ítems:</b>{" "}
                    {o.items?.reduce((a, i) => a + Number(i.quantity || 0), 0) ??
                      0}
                  </span>
                  <span>
                    <b>Pagos:</b> {o.payments?.length ?? 0}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
