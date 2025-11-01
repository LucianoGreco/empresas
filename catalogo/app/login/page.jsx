// app/login/page.jsx
"use client";

import { useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");

  // si ya hay sesión, no muestres login
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (j?.user) {
          window.location.href = "/";
        }
      } catch {}
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: pass }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      window.location.href = "/";
    } else {
      setMsg(j?.error || "Error");
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Ingresar</h1>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 8 }}>
          <label>Email</label>
          <input
            className="search-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Contraseña</label>
          <input
            className="search-input"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
        {msg && <p style={{ color: "crimson" }}>{msg}</p>}
        <button type="submit">Entrar</button>
      </form>
      <p style={{ marginTop: 16 }}>
        ¿No tenés cuenta? <a href="/register">Registrate</a>
      </p>
    </div>
  );
}
