"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import * as XLSX from "xlsx";
import { DEFAULT_ALLOWED, getCanonicalHeader } from "@/lib/import-constants";

const DEFAULT_SERVER_PATH =
  "D:\\empresas\\ferreluc\\gestion\\listas\\normalizadas\\grais\\data.xlsx";

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

// helpers
function mapHeaderToKey(h) {
  return getCanonicalHeader(h || "");
}
function colLetter(idx) {
  let s = "";
  idx++;
  while (idx > 0) {
    const mod = (idx - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    idx = Math.floor((idx - 1) / 26);
  }
  return s;
}

const DEFAULT_CHECKED = new Set(["inventario", "caja", "marca"]);
const LS_KEY = "import-checked-columns";
function saveCheckedToLS(keysSet) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(keysSet)));
  } catch {}
}
function loadCheckedFromLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : null;
  } catch {
    return null;
  }
}

// styled-components
const Page = styled.div`max-width:1120px;margin:0 auto;padding:32px 24px 48px;`;
const HeaderCard = styled.div`
  background: linear-gradient(135deg, rgba(24,24,27,0.9), rgba(39,39,42,0.7));
  border: 1px solid rgba(63,63,70,0.6); border-radius:22px; padding:20px 22px; margin-bottom:20px;
  box-shadow:0 6px 20px rgba(0,0,0,0.25); display:flex; flex-direction:column; gap:12px;
  @media (min-width:768px){ flex-direction:row; align-items:center; justify-content:space-between; }
`;
const TitleWrap = styled.div``;
const Title = styled.h1`font-size:22px;font-weight:700;margin:0 0 4px;`;
const Subtitle = styled.p`margin:0;font-size:13px;color:#a1a1aa;`;
const HeaderActions = styled.div`display:flex;gap:10px;align-items:center;flex-wrap:wrap;`;
const Select = styled.select`appearance:none;border:1px solid #3f3f46;border-radius:12px;background:#0a0a0b;color:#e5e7eb;padding:8px 12px;font-size:13px;`;
const GhostBtn = styled.button`
  border:1px solid #3f3f46;border-radius:12px;background:transparent;color:#e5e7eb;padding:8px 12px;font-size:13px;cursor:pointer;transition:background .15s ease;
  &:hover{background:#18181b;}
  opacity:${p=>p.disabled?0.6:1};pointer-events:${p=>p.disabled?"none":"auto"};
`;
const DangerGhost = styled(GhostBtn)`border-color:#7f1d1d;color:#fecaca;&:hover{background:#3b0a0a;}`;

const Grid = styled.div`display:grid;gap:20px;grid-template-columns:1fr;@media(min-width:860px){grid-template-columns:1fr 1fr;}`;
const Card = styled.div`border:1px solid #27272a;background:rgba(10,10,11,0.6);border-radius:22px;padding:18px;box-shadow:0 6px 20px rgba(0,0,0,0.2);`;
const CardTitle = styled.h2`font-size:15px;margin:0 0 4px;font-weight:600;`;
const CardHint = styled.p`margin:0 0 12px;font-size:12px;color:#9ca3af;`;
const FileInput = styled.input`
  font-size:13px;color:#e5e7eb;
  &::file-selector-button{margin-right:12px;border:0;border-radius:12px;background:#27272a;color:#e5e7eb;padding:8px 12px;font-size:13px;cursor:pointer;}
  &::file-selector-button:hover{background:#3f3f46;}
`;
const PrimaryBtn = styled.button`
  margin-top:12px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:16px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;
  box-shadow:0 3px 12px rgba(0,0,0,0.25); color:#0a0a0b; background:${p=>p.disabled?"#3f3f46":"#fafafa"}; opacity:${p=>p.disabled?0.6:1}; pointer-events:${p=>p.disabled?"none":"auto"};
  &:hover{background:${p=>p.disabled?"#3f3f46":"#ffffff"};}
`;
const DangerBtn = styled(PrimaryBtn)`background:${p=>p.disabled?"#783232":"#ef4444"};color:white;&:hover{background:${p=>p.disabled?"#783232":"#dc2626"};}`;
const TextInput = styled.input`width:100%;border:1px solid #3f3f46;border-radius:12px;background:#0a0a0b;color:#e5e7eb;padding:8px 12px;font-size:13px;outline:none;&:focus{box-shadow:0 0 0 2px #3f3f46;}`;
const PairActions = styled.div`display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;`;

const ChipsBox = styled.div`margin-top:20px;border:1px solid #27272a;border-radius:22px;background:rgba(10,10,11,0.6);padding:14px;`;
const ChipsTitle = styled.h3`margin:0 0 10px;font-size:14px;font-weight:600;`;
const ChipsWrap = styled.div`display:flex;flex-wrap:wrap;gap:8px;`;
const Chip = styled.span`display:inline-flex;align-items:center;gap:8px;border:1px solid #3f3f46;background:#0f0f12;color:#e5e7eb;border-radius:12px;padding:5px 10px;font-size:12px;`;
const ChipClose = styled.button`border:0;background:#242427;color:#e5e7eb;font-size:11px;padding:0 6px;border-radius:7px;cursor:pointer;&:hover{background:#36363a;}`;

const ColumnsPanel = styled.div`margin-top:20px;border:1px solid #27272a;border-radius:22px;background:rgba(10,10,11,0.6);padding:18px;`;
const ColumnsHeader = styled.div`display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;`;
const ColumnsHint = styled.div`font-size:12px;color:#9ca3af;`;
const ColumnsGrid = styled.div`display:grid;gap:10px;grid-template-columns:1fr;@media(min-width:860px){grid-template-columns:1fr 1fr;}@media(min-width:1140px){grid-template-columns:1fr 1fr 1fr;}`;
const ColItem = styled.label`display:flex;gap:10px;align-items:center;border:1px solid #2f2f33;background:#131317;border-radius:12px;padding:8px 10px;&:hover{background:#17171b;}`;
const Badge = styled.span`display:inline-block;border:1px solid #3f3f46;background:#1e1e22;padding:2px 6px;border-radius:8px;font-size:11px;min-width:24px;text-align:center;color:#d4d4d8;margin-right:4px;`;
const KeyCode = styled.code`color:#d4d4d8;`;

const TableCard = styled.div`margin-top:20px;border:1px solid #27272a;border-radius:22px;background:rgba(10,10,11,0.6);padding:18px;`;
const TableWrap = styled.div`max-height:420px;overflow:auto;border:1px solid #2b2b2f;border-radius:12px;`;
const Table = styled.table`
  width:100%;border-collapse:collapse;font-size:13px;
  th,td{border-bottom:1px solid #1f1f23;padding:8px 10px;vertical-align:top;}
  thead th{position:sticky;top:0;background:rgba(12,12,14,0.95);font-weight:600;}
  tbody tr:nth-child(odd){background:rgba(18,18,20,0.45);}
`;

const Alert = styled.div`
  margin-top:14px;border-radius:16px;padding:12px 14px;font-size:13px;
  border:1px solid ${p=>p.type==="error"?"#7f1d1d":p.type==="warn"?"#854d0e":"#064e3b"};
  background:${p=>p.type==="error"?"rgba(127,29,29,0.25)":p.type==="warn"?"rgba(133,77,14,0.25)":"rgba(6,78,59,0.25)"};
  color:${p=>p.type==="error"?"#fecaca":p=>p.type==="warn"?"#fde68a":"#bbf7d0"};
`;
const FooterTip = styled.p`margin-top:18px;font-size:12px;color:#9ca3af;`;

// Progress bar
const ProgressWrap = styled.div`
  position: relative;
  width: 100%;
  height: 10px;
  border-radius: 9999px;
  overflow: hidden;
  background: #1f1f23;
  border: 1px solid #2b2b2f;
`;
const ProgressInner = styled.div`
  height: 100%;
  width: ${p => p.$pct}%;
  transition: width .15s ease;
  background: linear-gradient(90deg, #a78bfa, #60a5fa, #22d3ee);
  background-size: 200% 100%;
  animation: move 1.2s linear infinite;
  @keyframes move { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
`;
const ProgressLabel = styled.div`
  margin-top:6px; font-size:12px; color:#a1a1aa; display:flex; justify-content:space-between;
`;

// useIndeterminateProgress
function useIndeterminateProgress() {
  const [visible, setVisible] = useState(false);
  const [pct, setPct] = useState(0);
  const [label, setLabel] = useState("");
  const timer = useRef(null);

  const start = (msg = "Procesando…") => {
    if (timer.current) clearInterval(timer.current);
    setLabel(msg);
    setVisible(true);
    setPct(8);
    timer.current = setInterval(() => {
      setPct(prev => {
        if (prev >= 92) return 92;
        const step = prev < 40 ? 4 : prev < 75 ? 2 : 1;
        return Math.min(prev + step, 92);
      });
    }, 160);
  };

  const done = (msg = "Completado") => {
    if (timer.current) clearInterval(timer.current);
    setLabel(msg);
    setPct(100);
    setTimeout(() => { setVisible(false); setPct(0); setLabel(""); }, 500);
  };

  const fail = (msg = "Error") => {
    if (timer.current) clearInterval(timer.current);
    setLabel(msg);
    setPct(100);
    setTimeout(() => { setVisible(false); setPct(0); setLabel(""); }, 800);
  };

  return { visible, pct, label, start, done, fail };
}

export default function ImportPage() {
  const [file, setFile] = useState(null);
  const [serverPath, setServerPath] = useState(DEFAULT_SERVER_PATH);
  const [strategy, setStrategy] = useState("merge");

  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [checked, setChecked] = useState(() => loadCheckedFromLS() || new Set(DEFAULT_CHECKED));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [catalogInfo, setCatalogInfo] = useState({ count: 0, path: "" });

  const progress = useIndeterminateProgress();

  useEffect(() => { saveCheckedToLS(checked); }, [checked]);

  // Refresca meta de catálogo (GET setea cookie CSRF si no existe)
  async function refreshCatalogMeta() {
    try {
      const res = await fetch("/api/admin/import", { method: "GET", cache: "no-store" });
      const data = await res.json();
      if (res.ok) setCatalogInfo({ count: data.count ?? 0, path: data.path || "" });
    } catch {}
  }

  useEffect(() => { refreshCatalogMeta(); }, []);
  useEffect(() => { if (result) refreshCatalogMeta(); }, [result]);

  const canImport = useMemo(() => (file || serverPath) && checked.size > 0, [file, serverPath, checked]);

  function resetPreview() { setHeaders([]); setRows([]); setResult(null); setError(""); }

  // PREVIEW PC
  async function handleFileChange(e) {
    resetPreview();
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (!f) return;
    try {
      setLoading(true);
      progress.start("Leyendo Excel (PC)...");
      const arrayBuf = await f.arrayBuffer();
      const wb = XLSX.read(arrayBuf, { type: "array" });
      const first = wb.SheetNames[0];
      const ws = wb.Sheets[first];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setRows(json);
      const keys = Object.keys(json[0] || {});
      const mapped = keys.map((h, i) => ({ letter: colLetter(i), header: h, key: mapHeaderToKey(h) }));
      setHeaders(mapped);
      const initial = new Set(loadCheckedFromLS() || DEFAULT_CHECKED);
      for (const item of mapped) if (DEFAULT_ALLOWED.includes(item.key)) initial.add(item.key);
      setChecked(initial);
      progress.done("Excel leído");
    } catch (err) {
      console.error(err); setError("No se pudo leer el archivo XLSX."); progress.fail("Error al leer Excel");
    } finally { setLoading(false); }
  }

  function toggleCheck(k) { const next = new Set(checked); next.has(k) ? next.delete(k) : next.add(k); setChecked(next); }
  function clearChecks() { setChecked(new Set()); }
  function selectDefaults() {
    const initial = new Set(DEFAULT_CHECKED);
    for (const item of headers) if (DEFAULT_ALLOWED.includes(item.key)) initial.add(item.key);
    setChecked(initial);
  }

  // IMPORT PC
  async function doImportFile() {
    if (!file) return;
    setLoading(true); setError(""); setResult(null);
    try {
      progress.start("Importando (archivo)...");
      const allowedCsv = Array.from(checked).join(",");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("strategy", strategy);
      fd.append("allowed", allowedCsv);
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "x-csrf-token": getCsrf() }, // CSRF
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error al importar");
      setResult(data);
      // refresco explícito por si hay caché intermedia
      await refreshCatalogMeta();
      progress.done("Importación completa");
    } catch (e) {
      setError(e.message || "Error al importar."); progress.fail("Falló la importación");
    } finally { setLoading(false); }
  }

  // PREVIEW SERVER (POST con preview=true; dejo CSRF listo)
  async function doServerPreview() {
    setLoading(true); setError(""); setResult(null);
    try {
      progress.start("Previsualizando (servidor)...");
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrf() },
        body: JSON.stringify({ sourcePath: serverPath, preview: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error en preview");
      setRows(data.preview.rows || []);
      const mapped = (data.preview.headers || []).map((h, i) => ({
        letter: colLetter(i), header: h.header, key: h.key
      }));
      setHeaders(mapped);
      const initial = new Set(loadCheckedFromLS() || DEFAULT_CHECKED);
      for (const item of mapped) if (DEFAULT_ALLOWED.includes(item.key)) initial.add(item.key);
      setChecked(initial);
      setResult({ ok: true, preview: true, count_in: data.preview.count_in });
      progress.done("Preview listo");
    } catch (e) {
      setError(e.message || "Error en preview."); progress.fail("Falló el preview");
    } finally { setLoading(false); }
  }

  // IMPORT SERVER
  async function doServerImport() {
    setLoading(true); setError(""); setResult(null);
    try {
      progress.start("Importando (servidor)...");
      const allowedCsv = Array.from(checked).join(",");
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrf() }, // CSRF
        body: JSON.stringify({ sourcePath: serverPath, strategy, allowed: allowedCsv }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error al importar");
      setResult(data);
      await refreshCatalogMeta();
      progress.done("Importación completa");
    } catch (e) {
      setError(e.message || "Error al importar desde servidor."); progress.fail("Falló la importación");
    } finally { setLoading(false); }
  }

  // DELETE CATALOGO
  async function wipeCatalog() {
    if (!confirmWipe) { setConfirmWipe(true); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      progress.start("Borrando catálogo...");
      const res = await fetch("/api/admin/import", {
        method: "DELETE",
        headers: { "x-csrf-token": getCsrf() }, // CSRF
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error al borrar catálogo");
      setHeaders([]); setRows([]); setChecked(loadCheckedFromLS() || new Set(DEFAULT_CHECKED));
      setResult({ ok: true, cleared: true, previous_count: data.previous_count, path: data.path });
      await refreshCatalogMeta();
      progress.done("Catálogo borrado");
    } catch (e) {
      setError(e.message || "Error al borrar catálogo."); progress.fail("Falló el borrado");
    } finally { setLoading(false); setConfirmWipe(false); }
  }

  return (
    <Page>
      <HeaderCard>
        <TitleWrap>
          <Title>Importar Excel</Title>
          <Subtitle>
            Previsualizá, elegí columnas a sobrescribir y aplicá <b>merge</b> o <b>replace</b> sobre el JSON.
            {catalogInfo?.path ? <> &nbsp;|&nbsp; <code>{catalogInfo.path}</code></> : null}
            &nbsp;—&nbsp; <b>{catalogInfo?.count ?? 0}</b> registros actuales.
          </Subtitle>
          {/* Barra de progreso */}
          {progress.visible && (
            <>
              <div style={{ marginTop: 10 }}>
                <ProgressWrap><ProgressInner $pct={progress.pct} /></ProgressWrap>
                <ProgressLabel>
                  <span>{progress.label}</span>
                  <span>{Math.floor(progress.pct)}%</span>
                </ProgressLabel>
              </div>
            </>
          )}
        </TitleWrap>
        <HeaderActions>
          <Select value={strategy} onChange={(e) => setStrategy(e.target.value)} disabled={loading}>
            <option value="merge">merge (recomendado)</option>
            <option value="replace">replace (reemplaza todo)</option>
          </Select>
          <GhostBtn onClick={selectDefaults} title="Seleccionar columnas por defecto" disabled={loading}>Defaults</GhostBtn>
          <GhostBtn onClick={clearChecks} title="Limpiar selección" disabled={loading}>Limpiar</GhostBtn>
          <DangerGhost onClick={wipeCatalog} title="Borrar catálogo (deja JSON vacío)" disabled={loading}>
            {confirmWipe ? "Confirmar borrado" : "Borrar catálogo"}
          </DangerGhost>
        </HeaderActions>
      </HeaderCard>

      <Grid>
        <Card>
          <CardTitle>Subir archivo (desde tu PC)</CardTitle>
          <CardHint>Acepta <code>.xlsx</code>. La primera hoja se usa por defecto.</CardHint>
          <FileInput type="file" accept=".xlsx" onChange={handleFileChange} disabled={loading} />
          <PrimaryBtn onClick={doImportFile} disabled={!file || !canImport || loading}>
            {loading ? "Procesando..." : "Importar"}
          </PrimaryBtn>
        </Card>

        <Card>
          <CardTitle>Cargar desde ruta del servidor</CardTitle>
          <CardHint>Rutas locales (Windows). Útil para listas “normalizadas”.</CardHint>
          <TextInput value={serverPath} onChange={(e) => setServerPath(e.target.value)} disabled={loading} />
          <PairActions>
            <GhostBtn onClick={doServerPreview} disabled={loading}>
              {loading ? "..." : "Previsualizar"}
            </GhostBtn>
            <PrimaryBtn onClick={doServerImport} disabled={!serverPath || !canImport || loading}>
              {loading ? "..." : "Importar desde servidor"}
            </PrimaryBtn>
            <DangerBtn onClick={wipeCatalog} disabled={loading}>
              {confirmWipe ? "Confirmar borrado" : "Borrar catálogo"}
            </DangerBtn>
          </PairActions>
        </Card>
      </Grid>

      {headers.length > 0 && (
        <ChipsBox>
          <ChipsTitle>Columnas seleccionadas</ChipsTitle>
          <ChipsWrap>
            {Array.from(checked).length === 0 && (
              <span style={{ fontSize: 12, color: "#9ca3af" }}>Ninguna (no se sobreescribirá nada).</span>
            )}
            {Array.from(checked).map((k) => (
              <Chip key={k}>
                {k}
                <ChipClose onClick={() => toggleCheck(k)} title="Quitar">✕</ChipClose>
              </Chip>
            ))}
          </ChipsWrap>
        </ChipsBox>
      )}

      {headers.length > 0 && (
        <ColumnsPanel>
          <ColumnsHeader>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Elegí las columnas a sobrescribir/cargar</h3>
            <ColumnsHint>
              Tip: por defecto <b style={{ color: "#e5e7eb" }}>inventario</b>, <b style={{ color: "#e5e7eb" }}>caja</b>, <b style={{ color: "#e5e7eb" }}>marca</b>.
            </ColumnsHint>
          </ColumnsHeader>
          <ColumnsGrid>
            {headers.map((h) => (
              <ColItem key={h.letter + h.header}>
                <input type="checkbox" checked={checked.has(h.key)} onChange={() => toggleCheck(h.key)} style={{ width: 16, height: 16 }} disabled={loading} />
                <span style={{ fontSize: 13 }}>
                  <Badge>{h.letter}</Badge>
                  <b>{h.header}</b> <span style={{ color: "#9ca3af" }}>→</span>{" "}
                  <KeyCode>{h.key}</KeyCode>
                </span>
              </ColItem>
            ))}
          </ColumnsGrid>
        </ColumnsPanel>
      )}

      {rows.length > 0 && (
        <TableCard>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600 }}>Vista previa (primeras 20 filas)</h3>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th key={h.letter}>
                      <Badge>{h.letter}</Badge> {h.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((r, idx) => (
                  <tr key={idx}>
                    {headers.map((h) => (
                      <td key={h.letter}>{String(r[h.header] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </TableCard>
      )}

      {error && <Alert type="error"><b>Error:</b> {error}</Alert>}
      {result && (
        <Alert type={result.cleared ? "warn" : "ok"}>
          {result.cleared
            ? `Catálogo borrado. Registros previos: ${result.previous_count ?? 0} | json=${result.path}`
            : result.preview
              ? `Preview OK. Filas detectadas: ${result.count_in ?? ""}`
              : `Import OK. strategy=${result.strategy} | in=${result.count_in} → out=${result.count_out} | json=${result.path}`}
        </Alert>
      )}

      <FooterTip>
        Para evitar sobreescribir datos sensibles, destildá columnas que no quieras actualizar. La selección de columnas se guarda localmente.
      </FooterTip>
    </Page>
  );
}

/* fin */
