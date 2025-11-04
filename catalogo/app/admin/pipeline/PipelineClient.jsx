// app/admin/pipeline/PipelineClient.jsx
"use client";

import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

const ACTION_LABELS = {
  preview: "Solo previsualizar",
  precios: "Importar precios",
  imagenes: "Colocar imágenes",
  export: "Exportar JSON",
  todo: "Correr todo",
};

/* ========= styled ========== */
const PageWrap = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px 12px 40px;
  display: grid;
  gap: 18px;
`;

const HeaderRow = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
`;

const TitleBox = styled.div` display: grid; gap: 4px; `;
const Title = styled.h1` font-size: 22px; font-weight: 600; letter-spacing: -0.01em; color: #0f172a; `;
const Subtitle = styled.p` font-size: 13px; color: #6b7280; `;

const BtnBase = styled.button`
  appearance: none; border: 1px solid #e5e7eb; background: #fff; color: #111827;
  border-radius: 10px; padding: 8px 12px; font-size: 13px; cursor: pointer;
  transition: transform .02s ease, background .15s ease;
  &:hover { background: #f8fafc; }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: .6; cursor: not-allowed; }
`;

const Grid = styled.div`
  display: grid; gap: 14px;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  @media (min-width: 768px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (min-width: 1024px){ grid-template-columns: repeat(4, minmax(0, 1fr)); }
`;

const Card = styled.div`
  border: 1px solid #e5e7eb; border-radius: 16px; background: #fff; padding: 14px;
  box-shadow: 0 1px 0 0 rgba(0,0,0,0.03); display: grid; gap: 8px;
`;
const CardHead = styled.div` display: flex; align-items: center; justify-content: space-between; gap: 8px; `;
const Badge = styled.span`
  font-size: 11px; padding: 2px 8px; border-radius: 999px;
  border: 1px solid ${p => (p.$ok ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)")};
  background: ${p => (p.$ok ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)")};
  color: ${p => (p.$ok ? "rgb(5,150,105)" : "rgb(220,38,38)")};
`;
const Small = styled.p` font-size: 12px; color: #6b7280; line-height: 1.35; word-break: break-all; `;
const Muted = styled.p` font-size: 11px; color: #9ca3af; `;
const DownloadBtn = styled(BtnBase)` width: 100%; margin-top: 6px; background: #f9fafb; `;

const ActionsCard = styled(Card)` grid-column: 1 / -1; `;
const ActionsWrap = styled.div` display: flex; flex-wrap: wrap; gap: 8px; `;
const ActionBtn = styled(BtnBase)`
  background: #f3f4f6; &:hover { background: #e5e7eb; }
  ${p => p.$active && `background: #0ea5e9; color: #fff; border-color: #0ea5e9; &:hover { background: #0284c7; }`}
`;

const fadeIn = keyframes` from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); }`;
const ResultBox = styled.div` border: 1px solid #e5e7eb; border-radius: 16px; background: #f8fafc; padding: 14px; animation: ${fadeIn} .18s ease both; `;
const ResultHeader = styled.p` font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; `;
const Pre = styled.pre` margin-top: 10px; max-height: 280px; overflow: auto; background: #fff; border-radius: 12px; padding: 12px; font-size: 12px; border: 1px solid #e5e7eb; `;
const ErrorBox = styled.div` border: 1px solid rgba(239,68,68,.35); border-radius: 12px; background: rgba(239,68,68,.08); color: rgb(239,68,68); padding: 10px 12px; font-size: 13px; `;

/* ====== paths (compacto, sin uploads aquí) ====== */
const PathsCard = styled(Card)` grid-column: 1 / -1; `;
const Row = styled.div`
  display: grid; grid-template-columns: 160px 1fr auto; gap: 8px; align-items: center;
  @media (max-width: 900px){
    grid-template-columns: 1fr; align-items: stretch;
    & > * + * { margin-top: 6px; }
  }
`;
const Label = styled.div` font-size: 12px; color: #6b7280; `;
const PathView = styled.input`
  font-size: 12.5px; color: #111827; padding: 8px 10px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px;
`;

export default function PipelineClient() {
  const [status, setStatus] = useState(null);
  const [runningAction, setRunningAction] = useState(null);
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState(null);

  const [origen, setOrigen] = useState("D:\\empresas\\ferreluc\\gestion\\listas\\originales\\grais\\data.xlsx");
  const [destino, setDestino] = useState("D:\\empresas\\ferreluc\\gestion\\listas\\normalizadas\\grais\\data.xlsx");
  const [reporte, setReporte] = useState("D:\\empresas\\ferreluc\\gestion\\listas\\normalizadas\\grais\\reportes\\no_encontrados.xlsx");
  const [jsonPath, setJsonPath] = useState("D:\\empresas\\ferreluc\\gestion\\json\\producto_grais.json");

  function loadLS() {
    try {
      const o = JSON.parse(localStorage.getItem("pipelinePaths") || "{}");
      setOrigen(o.origen || origen);
      setDestino(o.destino || destino);
      setReporte(o.reporte || reporte);
      setJsonPath(o.json || jsonPath);
    } catch {}
  }
  function saveLS() {
    localStorage.setItem("pipelinePaths", JSON.stringify({ origen, destino, reporte, json: jsonPath }));
  }

  async function loadStatus() {
    try {
      const res = await fetch("/api/admin/pipeline/status", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo leer el estado");
      const json = await res.json();
      setStatus(json);
      setError("");
    } catch (e) {
      setError(e.message || "Error");
    }
  }

  useEffect(() => { loadLS(); loadStatus(); }, []);

  async function runAction(action) {
    setRunningAction(action);
    setError("");
    try {
      const body = { origen, destino, reporte, json: jsonPath };
      const res = await fetch(`/api/admin/pipeline/grais?action=${action}`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) throw new Error(json?.error || `Fallo action: ${action}`);
      setLastResult({ action, at: new Date().toISOString(), data: json?.data ?? null });
      saveLS();
      await loadStatus();
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setRunningAction(null);
    }
  }

  function downloadReporte() {
    window.open("/api/admin/pipeline/reporte", "_blank");
  }
  function downloadJson() {
    window.open("/api/admin/pipeline/json", "_blank");
  }

  const files = status?.files || {};

  return (
    <PageWrap>
      <HeaderRow>
        <TitleBox>
          <Title>Pipeline GRAIS</Title>
          <Subtitle>Importar precios, calcular y colocar imágenes.</Subtitle>
        </TitleBox>
        <div style={{ display: "flex", gap: 8 }}>
          <BtnBase onClick={saveLS}>Guardar rutas</BtnBase>
          <BtnBase onClick={loadStatus}>Actualizar</BtnBase>
        </div>
      </HeaderRow>

      {error ? <ErrorBox>{error}</ErrorBox> : null}

      {/* Rutas (compacto) */}
      <PathsCard>
        <Row>
          <Label>Origen (.xlsx)</Label>
          <PathView value={origen} onChange={(e)=>setOrigen(e.target.value)} />
          <BtnBase onClick={saveLS}>Guardar</BtnBase>
        </Row>
        <Row>
          <Label>Destino (.xlsx)</Label>
          <PathView value={destino} onChange={(e)=>setDestino(e.target.value)} />
          <BtnBase onClick={saveLS}>Guardar</BtnBase>
        </Row>
        <Row>
          <Label>Reporte (xlsx)</Label>
          <PathView value={reporte} onChange={(e)=>setReporte(e.target.value)} />
          <BtnBase onClick={downloadReporte}>Descargar</BtnBase>
        </Row>
        <Row>
          <Label>JSON salida</Label>
          <PathView value={jsonPath} onChange={(e)=>setJsonPath(e.target.value)} />
          <BtnBase onClick={downloadJson}>Descargar</BtnBase>
        </Row>
      </PathsCard>

      {/* Estado de archivos */}
      <Grid>
        {["origen", "destino", "json", "reporte"].map((key) => {
          const f = files[key];
          return (
            <Card key={key}>
              <CardHead>
                <strong style={{ textTransform: "capitalize" }}>{key}</strong>
                <Badge $ok={!!f?.exists}>{f?.exists ? "OK" : "No existe"}</Badge>
              </CardHead>
              <Small>{f?.path || "—"}</Small>
              {f?.exists ? (
                <Muted>
                  {f.size} bytes{f.mtime ? ` · ${new Date(f.mtime).toLocaleString()}` : ""}
                </Muted>
              ) : null}
              {key === "reporte" ? <DownloadBtn onClick={downloadReporte}>Descargar</DownloadBtn> : null}
              {key === "json" ? <DownloadBtn onClick={downloadJson}>Descargar</DownloadBtn> : null}
            </Card>
          );
        })}
      </Grid>

      {/* Acciones */}
      <ActionsCard>
        <Subtitle style={{ marginBottom: 8 }}>Acciones</Subtitle>
        <ActionsWrap>
          {["preview", "precios", "imagenes", "export", "todo"].map((action) => (
            <ActionBtn
              key={action}
              onClick={() => runAction(action)}
              disabled={!!runningAction}
              $active={runningAction === action}
              title={ACTION_LABELS[action] ?? action}
            >
              {runningAction === action ? "Ejecutando..." : ACTION_LABELS[action] ?? action}
            </ActionBtn>
          ))}
        </ActionsWrap>
      </ActionsCard>

      {/* Resultado */}
      {lastResult ? (
        <ResultBox>
          <ResultHeader>Última ejecución</ResultHeader>
          <p style={{ fontSize: 13, color: "#111827" }}>
            Acción: <strong>{lastResult.action}</strong> · {new Date(lastResult.at).toLocaleString()}
          </p>
          {lastResult.data ? <Pre>{JSON.stringify(lastResult.data, null, 2)}</Pre> : null}
        </ResultBox>
      ) : null}
    </PageWrap>
  );
}

/* fin */
