// D:\empresas\catalogo\lib\catalog.js
import fs from "fs";
import { sanitizeImage } from "@/lib/config";
import { PREFERRED_ORDER } from "@/lib/import-constants";

/** Ordena claves según PREFERRED_ORDER y luego alfabético */
function orderKeysPreferred(obj) {
  const out = {};
  const pref = new Set(PREFERRED_ORDER || []);
  for (const k of (PREFERRED_ORDER || [])) if (k in obj) out[k] = obj[k];
  const rest = Object.keys(obj).filter(k => !pref.has(k)).sort();
  for (const k of rest) out[k] = obj[k];
  return out;
}

function toNumberSoft(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// Lectura segura del JSON (sincrónica, tolerante a errores)
export function tryReadJson(absPath) {
  try {
    if (!fs.existsSync(absPath)) return [];
    const raw = fs.readFileSync(absPath, "utf-8").trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return [parsed];
    return [];
  } catch {
    return [];
  }
}

// Escritura segura del JSON (atómica con rename, fallback directo en Windows)
export function saveJson(absPath, data) {
  try {
    const tmp = `${absPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmp, absPath);
  } catch {
    fs.writeFileSync(absPath, JSON.stringify(data, null, 2), "utf-8");
  }
}

// Normalizador riguroso para lecturas antiguas / merges defensivos
export function normalizeRowStrict(p, idx = 0) {
  const n = {
    id: `${p?.codigo_flexxus || p?.codigo || p?.sku || idx}`,
    codigo_flexxus: p?.codigo_flexxus ?? "",
    sku: p?.sku ?? "",
    nombre_descripcion: p?.nombre_descripcion ?? p?.descripcion_flexxus ?? "Sin nombre",
    costo: toNumberSoft(p?.costo),
    venta: toNumberSoft(p?.venta ?? p?.precio_venta),
    mayorista: toNumberSoft(p?.mayorista),
    inventario: toNumberSoft(p?.inventario),
    inv_minimo: toNumberSoft(p?.inv_minimo),
    inv_maximo: toNumberSoft(p?.inv_maximo),
    proveedor: p?.proveedor ?? "",
    descripcion_flexxus: p?.descripcion_flexxus ?? "",
    precio_venta: toNumberSoft(p?.precio_venta),
    caja: p?.caja ?? "",
    iva: p?.iva ?? 0,
    ganancia: toNumberSoft(p?.ganancia),
    imagen: sanitizeImage(p?.imagen),
    marca: p?.marca ?? "",
    categoria: p?.categoria ?? "",
    moneda: p?.moneda ?? "",
  };
  return orderKeysPreferred(n);
}

// Proyección pública (oculta campos sensibles o irrelevantes)
export function projectPublic(row) {
  return {
    id: row.id,
    codigo_flexxus: row.codigo_flexxus,
    nombre_descripcion: row.nombre_descripcion,
    venta: row.venta,
    mayorista: row.mayorista,
    inventario: row.inventario,
    imagen: row.imagen,
    marca: row.marca,
    moneda: row.moneda,
  };
}

/* fin */
