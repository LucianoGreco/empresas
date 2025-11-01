"use client";

import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setMsg("");
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "error");
      setRows(Array.isArray(j) ? j : []);
    } catch (e) {
      setMsg(e.message || "error");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (u) => {
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: u.id, isActive: !u.isActive }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "error");
      return;
    }
    load();
  };

  const setRole = async (u, role) => {
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: u.id, role }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "error");
      return;
    }
    load();
  };

  const pill = (text) => (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        border: "1px solid #e5e7eb",
        background: "#f8fafc",
      }}
    >
      {text}
    </span>
  );

  const btn = {
    base: {
      padding: "6px 10px",
      borderRadius: 8,
      border: "1px solid #e5e7eb",
      background: "#fff",
      cursor: "pointer",
      fontSize: 13,
      marginRight: 6,
    },
    muted: {
      opacity: 0.6,
      cursor: "default",
    },
  };

  return (
    <div style={{ maxWidth: 920, margin: "30px auto", fontFamily: "system-ui" }}>
      <h1>Usuarios</h1>
      {msg && <p style={{ color: "crimson" }}>{msg}</p>}
      <table width="100%" cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Email</th>
            <th align="left">Nombre</th>
            <th align="left">Rol</th>
            <th align="left">Activo</th>
            <th align="left">Alta</th>
            <th align="left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.name || "-"}</td>
              <td>{pill(u.role)}</td>
              <td>{u.isActive ? "Sí" : "No"}</td>
              <td>{new Date(u.createdAt).toLocaleString()}</td>
              <td>
                {/* Activar / Bloquear */}
                <button
                  onClick={() => toggleActive(u)}
                  style={btn.base}
                  title={u.isActive ? "Bloquear usuario" : "Aprobar usuario"}
                >
                  {u.isActive ? "Bloquear" : "Aprobar"}
                </button>

                {/* Rol: USER */}
                <button
                  onClick={() => setRole(u, "user")}
                  style={{
                    ...btn.base,
                    ...(u.role === "user" ? btn.muted : {}),
                  }}
                  disabled={u.role === "user"}
                  title="Asignar rol 'user'"
                >
                  user
                </button>

                {/* Rol: ADMIN */}
                <button
                  onClick={() => setRole(u, "admin")}
                  style={{
                    ...btn.base,
                    ...(u.role === "admin" ? btn.muted : {}),
                  }}
                  disabled={u.role === "admin"}
                  title="Asignar rol 'admin'"
                >
                  admin
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} style={{ opacity: 0.7 }}>
                Sin usuarios
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
