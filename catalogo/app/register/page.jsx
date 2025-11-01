"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: pass, name }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg(
        "Registro exitoso. Tu cuenta está pendiente de aprobación del administrador."
      );
      setEmail("");
      setPass("");
      setName("");
    } else {
      setMsg(j?.error || "Error");
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Registrarse</h1>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 8 }}>
          <label>Nombre</label>
          <input
            className="search-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
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
        {msg && <p style={{ color: msg.startsWith("Registro") ? "green" : "crimson" }}>{msg}</p>}
        <button type="submit">Crear cuenta</button>
      </form>
      <p style={{ marginTop: 16 }}>
        ¿Ya tenés cuenta? <a href="/login">Ingresá</a>
      </p>
    </div>
  );
}
