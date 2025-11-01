export const runtime = "nodejs"; // fuerza Node (stream/fs ok)

import fs from "fs";
import crypto from "crypto";
import { CFG, sanitizeImage } from "@/lib/config";
import { isAdminApi } from "@/lib/admin";

// parseo robusto AR/US -> número
function toNumberSoft(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (!s) return 0;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function tryReadJson(absPath) {
  try {
    if (!fs.existsSync(absPath)) return [];
    const raw = fs.readFileSync(absPath, "utf-8");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" ? [parsed] : []);
  } catch {
    return [];
  }
}

function normalizeRow(p, idx) {
  const img = sanitizeImage(p?.imagen);
  const id =
    String(p?.sku || "").trim() ||
    String(p?.codigo_flexxus || "").trim() ||
    String(p?.codigo || "").trim() ||
    String(idx);

  return {
    id,
    sku: String(p?.sku ?? "").trim(),
    codigo_flexxus: String(p?.codigo_flexxus ?? "").trim(),
    nombre_descripcion: p?.nombre_descripcion ?? p?.descripcion_flexxus ?? "Sin nombre",
    costo: toNumberSoft(p?.costo),
    venta: toNumberSoft(p?.venta ?? p?.precio_venta),
    mayorista: toNumberSoft(p?.mayorista),
    inventario: toNumberSoft(p?.inventario),
    inv_minimo: toNumberSoft(p?.inv_minimo),
    inv_maximo: toNumberSoft(p?.inv_maximo),
    proveedor: String(p?.proveedor ?? "").trim(),
    descripcion_flexxus: String(p?.descripcion_flexxus ?? "").trim(),
    precio_venta: toNumberSoft(p?.precio_venta),
    caja: p?.caja ?? "",
    iva: p?.iva ?? 0,
    ganancia: toNumberSoft(p?.ganancia),
    imagen: img,
    marca: String(p?.marca ?? "").trim(),
    categoria: String(p?.categoria ?? "").trim(),
    moneda: String(p?.moneda ?? "").trim(),
  };
}

// Proyección: "modo usuario" incluye categoria; admin ve todo
function project(row, admin) {
  if (admin) return row;
  return {
    id: row.id,
    codigo_flexxus: row.codigo_flexxus,
    nombre_descripcion: row.nombre_descripcion,
    venta: row.venta,
    mayorista: row.mayorista,
    inventario: row.inventario,
    imagen: row.imagen,
    marca: row.marca,
    categoria: row.categoria,
    moneda: row.moneda,
  };
}

function matchesQuery(row, q) {
  if (!q) return true;
  const s = q.toLowerCase();
  return (
    row.nombre_descripcion?.toLowerCase().includes(s) ||
    row.marca?.toLowerCase().includes(s) ||
    row.categoria?.toLowerCase().includes(s) ||
    row.codigo_flexxus?.toLowerCase().includes(s) ||
    row.sku?.toLowerCase().includes(s)
  );
}

function stableSort(arr, sortKey, dir) {
  const m = dir === "desc" ? -1 : 1;
  return arr
    .map((v, i) => ({ v, i }))
    .sort((a, b) => {
      const A = a.v?.[sortKey];
      const B = b.v?.[sortKey];
      if (A === B) return a.i - b.i;
      if (A === undefined) return 1;
      if (B === undefined) return -1;
      if (typeof A === "number" && typeof B === "number") return (A - B) * m;
      return String(A).localeCompare(String(B)) * m;
    })
    .map((x) => x.v);
}

export async function GET(req) {
  const url = new URL(req.url);
  const admin = await isAdminApi(req);

  const q = (url.searchParams.get("q") || "").trim();
  const marca = (url.searchParams.get("marca") || "").trim().toLowerCase();
  const categoria = (url.searchParams.get("categoria") || "").trim().toLowerCase();

  const sort = (url.searchParams.get("sort") || "").trim() || "nombre_descripcion";
  const dir = ((url.searchParams.get("dir") || "asc").trim().toLowerCase() === "desc") ? "desc" : "asc";

  // Paginado seguro
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.max(1, Math.min(500, Number(url.searchParams.get("pageSize") || 50)));

  // Lee JSON, normaliza y proyecta
  const productosRaw = tryReadJson(CFG.jsonPath);
  const base = productosRaw.map((p, i) => normalizeRow(p, i)).map((r) => project(r, admin));

  // Filtros
  let list = base.filter((r) => matchesQuery(r, q));
  if (marca) list = list.filter((r) => r.marca?.toLowerCase() === marca);
  if (categoria) list = list.filter((r) => r.categoria?.toLowerCase() === categoria);

  // Sort estable
  if (sort) list = stableSort(list, sort, dir);

  // Paginado
  const total = list.length;
  const start = (page - 1) * pageSize;
  const end = Math.min(total, start + pageSize);
  const items = list.slice(start, end);

  // ETag fuerte sobre payload: si cambia el JSON, cambia el hash
  const payload = JSON.stringify({ total, page, pageSize, items });
  const etag = `"p-${crypto.createHash("sha1").update(payload).digest("hex")}"`;
  const inm = req.headers.get("if-none-match");
  if (inm && inm === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        // Forzamos revalidación en cada request para ver cambios al instante
        "Cache-Control": "no-cache",
      },
    });
  }

  return new Response(payload, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Almacenable pero siempre con revalidación condicional vía ETag
      "Cache-Control": "no-cache",
      ETag: etag,
    },
  });
}

export async function POST(req) {
  const ok = await isAdminApi(req);
  if (!ok) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/* fin */
