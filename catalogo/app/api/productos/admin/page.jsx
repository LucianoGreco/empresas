"use client";

import { useState } from "react";

export default function AdminPage() {
  const [file, setFile] = useState(null);
  const [strategy, setStrategy] = useState("merge");
  const [allowed, setAllowed] = useState("");
  const [log, setLog] = useState("");
  const [token, setToken] = useState("");

  const onUpload = async (e) => {
    e.preventDefault();
    if (!file) { setLog("Elegí un Excel"); return; }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("strategy", strategy);
    if (allowed.trim()) fd.append("allowed", allowed.trim());

    const res = await fetch("/api/admin/import", {
      method: "POST",
      headers: token ? { "x-admin-token": token } : {},
      body: fd,
    });
    const j = await res.json();
    setLog(JSON.stringify(j, null, 2));
  };

  return (
    <main className="container" style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Admin</h1>
      <form onSubmit={onUpload} style={{ display: "grid", gap: 12 }}>
        <label>
          Admin Token
          <input type="password" value={token} onChange={e=>setToken(e.target.value)} placeholder="ADMIN_TOKEN" style={{ width: "100%" }} />
        </label>
        <label>
          Excel (data.xlsx)
          <input type="file" accept=".xlsx" onChange={e=>setFile(e.target.files?.[0] || null)} />
        </label>
        <label>
          Estrategia
          <select value={strategy} onChange={e=>setStrategy(e.target.value)}>
            <option value="merge">merge (actualiza y agrega)</option>
            <option value="replace">replace (reemplaza coincidencias)</option>
          </select>
        </label>
        <label>
          Allowed (CSV, opcional)
          <input
            type="text"
            value={allowed}
            onChange={e=>setAllowed(e.target.value)}
            placeholder="nombre_descripcion,venta,inventario,marca,imagen,moneda"
            style={{ width: "100%" }}
          />
        </label>
        <button type="submit">Importar y actualizar JSON</button>
      </form>

      <section style={{ marginTop: 24 }}>
        <h2>Resultado</h2>
        <pre style={{ background: "#111", color: "#0f0", padding: 12, borderRadius: 8, overflow: "auto", maxHeight: 360 }}>
{log || "// listo para importar"}
        </pre>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>APIs útiles</h2>
        <ul>
          <li><code>GET /api/productos</code> → modo usuario (proyección segura)</li>
          <li><code>GET /api/productos/admin</code> → modo admin (full) — requiere token o sesión</li>
          <li><code>POST /api/admin/import</code> (multipart) → subir Excel y actualizar JSON</li>
        </ul>
        <p style={{ color: "#888" }}>Tip: no se acepta <code>?admin_token=</code>. Usá cookie, header <code>x-admin-token</code> o Bearer.</p>
      </section>
    </main>
  );
}
