"use client";

import { useEffect, useState } from "react";

// === CSRF helper ===
function getCsrf() {
  try {
    return document.cookie
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("csrf_token="))
      ?.split("=", 2)[1] || "";
  } catch {
    return "";
  }
}

export default function AdminHome() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [file, setFile] = useState(null);
  const [strategy, setStrategy] = useState("merge");
  const [allowed, setAllowed] = useState("nombre_descripcion,venta,mayorista,inventario,marca,imagen,moneda,categoria");
  const [log, setLog] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  // Pipeline Grais
  const [graisLog, setGraisLog] = useState("");
  const [graisPreview, setGraisPreview] = useState(null);

  useEffect(() => {
    fetch("/api/admin/whoami", { cache: "no-store" })
      .then(r => r.json()).then(j => setIsAdmin(!!j?.admin))
      .catch(() => setIsAdmin(false));

    // Este GET también asegura que tengamos cookie CSRF emitida
    fetch("/api/admin/import/meta", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (j?.DEFAULT_ALLOWED?.length) setAllowed(j.DEFAULT_ALLOWED.join(",")); })
      .catch(() => {});
  }, []);

  const onUpload = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      if (file) fd.append("file", file);
      fd.append("strategy", strategy);
      if (allowed.trim()) fd.append("allowed", allowed.trim());

      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "x-csrf-token": getCsrf() }, // CSRF
        body: fd
      });
      const j = await res.json();
      setLog(JSON.stringify(j, null, 2));

      // ping meta para forzar refresco rápido en UI
      await fetch("/api/admin/import", { method: "GET", cache: "no-store" });
    } finally {
      setBusy(false);
    }
  };

  const onPreview = async (e) => {
    e.preventDefault();
    setBusy(true);
    setPreview(null);
    try {
      const fd = new FormData();
      if (file) fd.append("file", file);
      if (allowed.trim()) fd.append("allowed", allowed.trim());
      fd.append("limit", "300"); // máximo de errores a mostrar

      const res = await fetch("/api/admin/import/preview", {
        method: "POST",
        headers: { "x-csrf-token": getCsrf() }, // dejar listo (backend puede exigirlo)
        body: fd
      });
      const j = await res.json();
      setPreview(j);
    } finally {
      setBusy(false);
    }
  };

  const onExport = async (format) => {
    setBusy(true);
    try {
      const fd = new FormData();
      if (file) fd.append("file", file);
      if (allowed.trim()) fd.append("allowed", allowed.trim());

      const res = await fetch(`/api/admin/import/export?format=${format}`, {
        method: "POST",
        headers: { "x-csrf-token": getCsrf() }, // CSRF
        body: fd,
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "json" ? "import_errors.json" : "import_errors.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  // === Acciones Pipeline Grais ===
  const graisAction = async (action) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/pipeline/grais?action=${action}`, {
        method: "POST",
        headers: { "x-csrf-token": getCsrf() }, // por si el endpoint es mutación
      });
      const j = await res.json();
      if (action === "preview") setGraisPreview(j);
      setGraisLog(JSON.stringify(j, null, 2));

      // si exporta JSON catálogo, refrescamos meta
      if (action === "export" || action === "todo") {
        await fetch("/api/admin/import", { method: "GET", cache: "no-store" });
      }
    } finally {
      setBusy(false);
    }
  };

  const descargarReporte = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/pipeline/grais/reporte", { method: "GET", cache: "no-store" });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "no_encontrados.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) {
    return (
      <main className="container" style={{ maxWidth: 720, margin: "40px auto" }}>
        <h1>Admin</h1>
        <p>No logueado. <a href="/admin/login">Ingresar</a></p>
      </main>
    );
  }

  return (
    <main className="container" style={{ maxWidth: 1000, margin: "40px auto" }}>
      <h1>Panel Admin</h1>

      {/* === Sección Import genérico === */}
      <section style={{ marginBottom: 32 }}>
        <h2>Import XLSX → JSON de catálogo</h2>
        <form onSubmit={onUpload} style={{ display: "grid", gap: 12 }}>
          <label>Excel (data.xlsx)
            <input type="file" accept=".xlsx" onChange={e=>setFile(e.target.files?.[0] || null)} />
          </label>
          <label>Estrategia
            <select value={strategy} onChange={e=>setStrategy(e.target.value)}>
              <option value="merge">merge</option>
              <option value="replace">replace</option>
            </select>
          </label>
          <label>Allowed (CSV)
            <input className="search-input" value={allowed} onChange={e=>setAllowed(e.target.value)} />
          </label>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-secondary" onClick={onPreview} disabled={busy} type="button">
              {busy ? "Procesando..." : "Preview + validar"}
            </button>
            <button className="btn" onClick={() => onExport("csv")} disabled={busy || !file} type="button">
              Exportar errores CSV
            </button>
            <button className="btn" onClick={() => onExport("json")} disabled={busy || !file} type="button">
              Exportar errores JSON
            </button>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Importando..." : "Importar y actualizar JSON"}
            </button>
          </div>
        </form>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
          <div>
            <h3>Resultado import</h3>
            <pre style={{ background: "#111", color: "#0f0", padding: 12, borderRadius: 8, overflow: "auto", maxHeight: 300 }}>
{log || "// listo para importar"}
            </pre>
          </div>
          <div>
            <h3>Preview validado</h3>
            <pre style={{ background: "#0b1020", color: "#cde", padding: 12, borderRadius: 8, overflow: "auto", maxHeight: 300 }}>
{preview ? JSON.stringify(preview, null, 2) : "// ejecutá 'Preview + validar' para ver stats y errores"}
            </pre>
          </div>
        </div>
      </section>

      {/* === Sección Pipeline Grais (nuevo) === */}
      <section>
        <h2>Pipeline Grais (origen → normalizada → imágenes → JSON catálogo)</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <button className="btn btn-secondary" disabled={busy} onClick={() => graisAction("preview")}>
            {busy ? "..." : "Preview"}
          </button>
          <button className="btn" disabled={busy} onClick={() => graisAction("precios")}>
            {busy ? "..." : "Calcular precios (K/L → C,D,M,N)"}
          </button>
          <button className="btn" disabled={busy} onClick={() => graisAction("imagenes")}>
            {busy ? "..." : "Colocar imágenes por categoría"}
          </button>
          <button className="btn" disabled={busy} onClick={() => graisAction("export")}>
            {busy ? "..." : "Exportar JSON catálogo"}
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={() => graisAction("todo")}>
            {busy ? "..." : "Ejecutar TODO"}
          </button>
          <button className="btn" disabled={busy} onClick={descargarReporte}>
            Descargar no_encontrados.xlsx
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <h3>Preview Grais</h3>
            <pre style={{ background: "#0b1020", color: "#cde", padding: 12, borderRadius: 8, overflow: "auto", maxHeight: 300 }}>
{graisPreview ? JSON.stringify(graisPreview, null, 2) : "// ejecutá 'Preview' para ver totales y samples"}
            </pre>
          </div>
          <div>
            <h3>Log Pipeline</h3>
            <pre style={{ background: "#101010", color: "#9f9", padding: 12, borderRadius: 8, overflow: "auto", maxHeight: 300 }}>
{graisLog || "// sin ejecutar"}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
}

/* fin */
