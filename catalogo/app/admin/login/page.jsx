// D:\empresas\catalogo\app\admin\login\page.jsx
"use client";

import { useEffect, useState } from "react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // Si llegó ?admin_token=..., el middleware se encarga de setear cookie y redirigir
    const p = new URLSearchParams(window.location.search);
    if (p.get("admin_token")) {
      setMsg("Verificando token…");
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { "x-admin-token": token } : {}),
      },
      body: JSON.stringify({ email, password: pass }),
    });

    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "/admin/users";
      window.location.href = redirect;
    } else {
      setMsg(j?.error || "Error");
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Admin Login</h1>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 8 }}>
          <label>Token (opcional)</label>
          <input
            className="search-input"
            placeholder="ADMIN_TOKEN"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Email (opcional)</label>
          <input
            className="search-input"
            type="email"
            placeholder="Email (ADMIN_EMAIL)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Password (opcional)</label>
          <input
            className="search-input"
            type="password"
            placeholder="Password (ADMIN_PASSWORD)"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        {msg && <p style={{ color: "crimson" }}>{msg}</p>}
        <button type="submit">Entrar</button>
      </form>
      <p style={{ marginTop: 16, opacity: 0.75 }}>
        Tip: podés ir directo a <code>/admin/users?admin_token=TU_ADMIN_TOKEN</code>;
        el middleware setea la cookie.
      </p>
    </div>
  );
}
