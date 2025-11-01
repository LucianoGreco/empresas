// D:\empresas\ferreluc\gestion\scripts\common.cjs
// Utilidades compartidas por todos los scripts .cjs
// - carga headers
// - normaliza nombres de columnas
// - casting de números
// - manejo de imágenes (FS + fuzzy)
// - helpers de excel

const fs = require("fs");
const path = require("path");
const { HEADERS_JSON_CANDIDATES, RUTAS } = require("./config.cjs");

// === Fuente única de headers (JSON) con fallback ===
function loadHeadersJson() {
  const candidates = HEADERS_JSON_CANDIDATES;
  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        return JSON.parse(raw);
      }
    } catch (err) {
      // no rompas toda la importación por un JSON roto
      console.warn("[common] No se pudo leer headers.json en:", p, err.message);
    }
  }
  return null;
}

const HEADERS_JSON = loadHeadersJson();

// ---------- Strings / Headers ----------
function normalizeHeader(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Si no hay JSON, usamos fallback estático mínimo
const FALLBACK_HEADER_ALIASES = {
  "codigo flexxus": "codigo_flexxus",
  "codigo_flexxus": "codigo_flexxus",
  "nombre descripcion": "nombre_descripcion",
  "nombre_descripcion": "nombre_descripcion",
  costo: "costo",
  venta: "venta",
  mayorista: "mayorista",
  inventario: "inventario",
  "inv_minimo": "inv_minimo",
  "inv minimo": "inv_minimo",
  "inv_maximo": "inv_maximo",
  "inv maximo": "inv_maximo",
  "inv_máximo": "inv_maximo",
  "inv máximo": "inv_maximo",
  proveedor: "proveedor",
  "descripcion flexxus": "descripcion_flexxus",
  "descripcion_flexxus": "descripcion_flexxus",
  "precio venta": "precio_venta",
  "precio_venta": "precio_venta",
  caja: "caja",
  iva: "iva",
  ganancia: "ganancia",
  imagen: "imagen",
  marca: "marca",
  categoria: "categoria",
  moneda: "moneda",
};

const HEADER_MAP = (() => {
  if (HEADERS_JSON?.aliases) {
    const map = {};
    for (const [canonical, list] of Object.entries(HEADERS_JSON.aliases)) {
      for (const variant of list) map[normalizeHeader(variant)] = canonical;
    }
    // mantener compatibilidad con cabeceras ya normalizadas
    for (const canonical of Object.keys(HEADERS_JSON.aliases)) {
      map[normalizeHeader(canonical.replace(/_/g, " "))] = canonical;
      map[normalizeHeader(canonical)] = canonical;
    }
    return map;
  }
  return FALLBACK_HEADER_ALIASES;
})();

const PREFERRED_ORDER = Array.isArray(HEADERS_JSON?.preferredOrder)
  ? HEADERS_JSON.preferredOrder
  : [
      "codigo_flexxus",
      "nombre_descripcion",
      "costo",
      "venta",
      "mayorista",
      "inventario",
      "inv_minimo",
      "inv_maximo",
      "proveedor",
      "descripcion_flexxus",
      "precio_venta",
      "caja",
      "iva",
      "ganancia",
      "imagen",
      "marca",
      "categoria",
      "moneda",
    ];

function toSnakeCase(s) {
  return String(s)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function sortKeys(obj) {
  const known = {};
  const rest = {};
  for (const k of Object.keys(obj)) {
    if (PREFERRED_ORDER.includes(k)) known[k] = obj[k];
    else rest[k] = obj[k];
  }
  const out = {};
  for (const k of PREFERRED_ORDER) if (k in known) out[k] = known[k];
  for (const k of Object.keys(rest).sort()) out[k] = rest[k];
  return out;
}

// ---------- Números / Casting ----------
function parsePrecio(val) {
  if (val == null) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  const s = String(val).trim();
  if (!s) return null;
  // "12.345,67" -> 12345.67  || "12345.67" -> 12345.67
  const normalized = s.replace(/\./g, "").replace(/,/g, ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function castValue(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "boolean") return v;
  let s = String(v).trim();
  if (s === "") return null;
  if (/^(true|false)$/i.test(s)) return /^true$/i.test(s);
  const numCandidate = s.replace(/\./g, "").replace(/,/g, ".");
  if (/^-?\d+(\.\d+)?$/.test(numCandidate)) {
    const n = Number(numCandidate);
    if (!Number.isNaN(n)) return n;
  }
  return s;
}

// ---------- Archivos / FS ----------
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

// ---------- Excel helpers (exceljs) ----------
function toKey(s) {
  return String(s ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function buildHeaderIndex(worksheet) {
  const headerRow = worksheet.getRow(1);
  const map = new Map();
  for (let c = 1; c <= worksheet.columnCount; c++) {
    const key = toKey(headerRow.getCell(c).value);
    if (key) map.set(key, c);
  }
  return map;
}

function readCellText(cell) {
  if (!cell) return "";
  if (cell.text && String(cell.text).trim()) return String(cell.text).trim();
  const v = cell.value;
  if (v && typeof v === "object" && "result" in v && v.result)
    return String(v.result).trim();
  if (v && typeof v === "object" && "richText" in v && Array.isArray(v.richText)) {
    return v.richText.map((t) => t.text).join("");
  }
  if (v != null) return String(v).trim();
  return "";
}

// ---------- Imágenes ----------
function normalizeImagenPath(val) {
  // 1) nada -> fallback
  if (val == null || val === "") return "/imagenes/sin_imagen.png";

  // 2) limpiar slash de windows
  let s = String(val).trim().replace(/\\/g, "/");

  // 3) si ya es el fallback (con o sin slash)
  if (/^\/?sin_imagen\.png$/i.test(s)) return "/imagenes/sin_imagen.png";

  // 4) si viene con ruta física del gestion -> mapearla
  const gestionImgPrefix = RUTAS?.IMAGES_DIR
    ? String(RUTAS.IMAGES_DIR).replace(/\\/g, "/")
    : "D:/empresas/ferreluc/gestion/imagenes";

  if (s.toLowerCase().startsWith(gestionImgPrefix.toLowerCase())) {
    s = s.slice(gestionImgPrefix.length);
  }

  // 5) si empieza con / o \, sacamos
  s = s.replace(/^\/+/, "");

  // 6) si es url absoluta, la dejamos
  if (/^https?:\/\//i.test(s)) return s;

  // 7) caso final: la dejamos bajo /imagenes/...
  return `/imagenes/${s}`;
}

function normName(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_.:\/\\]+/g, " ")
    .replace(/[(){}\[\]-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokensOf(s) {
  return normName(s)
    .split(" ")
    .filter(Boolean);
}

function tokenOverlapScore(a, b) {
  const ta = new Set(tokensOf(a));
  const tb = new Set(tokensOf(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const denom = Math.max(ta.size, tb.size);
  return inter / denom;
}

function scanImages(dir) {
  if (!fs.existsSync(dir)) return { byKey: new Map(), list: [] };
  const files = fs.readdirSync(dir);
  // preferencia por extensión
  const pref = { ".png": 5, ".jpg": 4, ".jpeg": 4, ".webp": 3, ".gif": 2, "": 1 };

  const byKey = new Map();
  const list = [];

  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (!stat.isFile()) continue;
    const parsed = path.parse(full);
    const base = parsed.name;
    const key = normName(base);
    const ext = (parsed.ext || "").toLowerCase();
    const score = pref[ext] ?? 0;

    const item = { full, base, key, ext, pref: score };
    list.push(item);

    const cur = byKey.get(key);
    if (!cur) {
      byKey.set(key, full);
    } else {
      const curExt = path.parse(cur).ext.toLowerCase();
      const curScore = pref[curExt] ?? 0;
      if (score > curScore) byKey.set(key, full);
    }
  }

  return { byKey, list };
}

function bestFuzzyMatch(query, imageEntries, threshold = 0.6) {
  const qn = normName(query);
  if (!qn) return null;

  let best = null;
  let bestScore = 0;

  for (const entry of imageEntries) {
    const includeBoost = entry.key.includes(qn) || qn.includes(entry.key) ? 0.15 : 0;
    const baseScore = tokenOverlapScore(qn, entry.key);
    const sizeSimBoost =
      (Math.min(tokensOf(qn).length, tokensOf(entry.key).length) /
        Math.max(tokensOf(qn).length, tokensOf(entry.key).length)) *
      0.05;

    const score = baseScore + includeBoost + sizeSimBoost;
    const tiebreak = entry.pref / 100;

    if (score + tiebreak > bestScore) {
      bestScore = score + tiebreak;
      best = entry;
    }
  }
  return best && bestScore >= threshold ? best.full : null;
}

module.exports = {
  // headers / orden / casting
  HEADERS_JSON,
  normalizeHeader,
  HEADER_MAP,
  PREFERRED_ORDER,
  toSnakeCase,
  sortKeys,

  // números
  parsePrecio,
  round2,
  castValue,

  // fs
  ensureDir,

  // excel
  toKey,
  buildHeaderIndex,
  readCellText,

  // imágenes
  normalizeImagenPath,
  scanImages,
  bestFuzzyMatch,
  normName,
  tokensOf,
  tokenOverlapScore,
};
