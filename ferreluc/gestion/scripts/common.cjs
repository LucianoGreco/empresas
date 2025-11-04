// D:\empresas\ferreluc\gestion\scripts\common.cjs
// Utilidades compartidas por todos los scripts .cjs
// - carga headers
// - normaliza nombres de columnas
// - casting de números
// - manejo de imágenes (FS + fuzzy)
// - helpers de excel (mejorados)
// - helpers genéricos para mapeos de columnas entre workbooks

const fs = require("fs");
const path = require("path");
const { HEADERS_JSON_CANDIDATES, RUTAS, PARAMS } = require("./config.cjs");

// === Fuente única de headers (JSON) con fallback ===
function loadHeadersJson() {
  const candidates = Array.from(new Set(HEADERS_JSON_CANDIDATES || []));
  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
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
const FALLBACK_HEADER_ALIASES = Object.freeze({
  "codigo flexxus": "codigo_flexxus",
  "codigo_flexxus": "codigo_flexxus",
  "nombre descripcion": "nombre_descripcion",
  "nombre_descripcion": "nombre_descripcion",
  costo: "costo",
  venta: "venta",
  mayorista: "mayorista",
  inventario: "inventario",
  inv_minimo: "inv_minimo",
  "inv minimo": "inv_minimo",
  inv_maximo: "inv_maximo",
  "inv maximo": "inv_maximo",
  "inv_máximo": "inv_maximo",
  "inv máximo": "inv_maximo",
  proveedor: "proveedor",
  "descripcion flexxus": "descripcion_flexxus",
  descripcion_flexxus: "descripcion_flexxus",
  "precio venta": "precio_venta",
  precio_venta: "precio_venta",
  caja: "caja",
  iva: "iva",
  ganancia: "ganancia",
  imagen: "imagen",
  marca: "marca",
  categoria: "categoria",
  moneda: "moneda",
});

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

/** Convierte letra de columna Excel ("E") a índice 1-based (5) */
function colLetterToIndex(letter) {
  if (!letter) return null;
  const s = String(letter).trim().toUpperCase();
  let idx = 0;
  for (let i = 0; i < s.length; i++) {
    idx = idx * 26 + (s.charCodeAt(i) - 64);
  }
  return idx || null;
}

/** Convierte índice 1-based (5) a letra ("E") */
function colIndexToLetter(index) {
  let n = Number(index) | 0;
  if (n < 1) return null;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Devuelve el worksheet por nombre (si existe) o el primero */
function getWorksheetByNameOrFirst(workbook, name) {
  if (!workbook) return null;
  if (name && workbook.getWorksheet && workbook.getWorksheet(name)) {
    return workbook.getWorksheet(name);
  }
  // exceljs: worksheet 1 es la primera hoja
  return workbook.worksheets?.[0] || workbook.getWorksheet(1) || null;
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

/** Igual que buildHeaderIndex, pero devuelve claves canónicas usando HEADER_MAP */
function buildHeaderIndexCanon(worksheet) {
  const headerRow = worksheet.getRow(1);
  const map = new Map();
  for (let c = 1; c <= worksheet.columnCount; c++) {
    const raw = headerRow.getCell(c).value;
    const key = normalizeHeader(raw);
    if (!key) continue;
    const canon = HEADER_MAP[key] || toSnakeCase(key);
    map.set(canon, c);
  }
  return map;
}

function readCellText(cell) {
  if (!cell) return "";
  if (cell.text && String(cell.text).trim()) return String(cell.text).trim();

  const v = cell.value;

  // Fórmulas con resultado calculado
  if (v && typeof v === "object" && "result" in v && v.result != null) {
    return String(v.result).trim();
  }

  // RichText
  if (v && typeof v === "object" && "richText" in v && Array.isArray(v.richText)) {
    return v.richText.map((t) => t.text).join("");
  }

  // Fechas/números/strings
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v.trim();
  if (v != null) return String(v).trim();

  return "";
}

// mapea una fila de excel a un objeto con claves canónicas
function mapHeadersFromRow(row, headerIndex) {
  const out = {};
  for (const [rawKey, colIdx] of headerIndex.entries()) {
    const canon = HEADER_MAP[rawKey] || toSnakeCase(rawKey);
    out[canon] = readCellText(row.getCell(colIdx));
  }
  return sortKeys(out);
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

  const lowerPrefix = gestionImgPrefix.toLowerCase();
  if (s.toLowerCase().startsWith(lowerPrefix)) {
    s = s.slice(gestionImgPrefix.length);
  }

  // 5) si empieza con / o \, sacamos
  s = s.replace(/^\/+/, "");

  // 6) si es url absoluta, la dejamos
  if (/^https?:\/\//i.test(s)) return s;

  // 7) evitar doble prefijo /imagenes/imagenes/...
  s = s.replace(/^imagenes\/+/i, "");

  // 8) caso final: la dejamos bajo /imagenes/...
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

function bestFuzzyMatch(query, imageEntries, threshold) {
  const realThreshold =
    typeof threshold === "number" ? threshold : PARAMS.IMAGE_FUZZY_THRESHOLD;
  const qn = normName(query);
  if (!qn) return null;

  let best = null;
  let bestScore = 0;

  const qTokens = tokensOf(qn);
  const qLen = qTokens.length || 1;

  for (const entry of imageEntries) {
    const includeBoost =
      entry.key.includes(qn) || qn.includes(entry.key) ? 0.15 : 0;

    const baseScore = tokenOverlapScore(qn, entry.key);

    const entryTokensLen = tokensOf(entry.key).length || 1;
    const sizeSimBoost = (Math.min(qLen, entryTokensLen) / Math.max(qLen, entryTokensLen)) * 0.05;

    const score = baseScore + includeBoost + sizeSimBoost;
    const tiebreak = entry.pref / 100;

    if (score + tiebreak > bestScore) {
      bestScore = score + tiebreak;
      best = entry;
    }
  }

  return best && bestScore >= realThreshold ? best.full : null;
}

/**
 * === Helper genérico para mapeos entre hojas ===
 * Copia valores de una columna origen a una columna destino matcheando por clave(s).
 * No escribe en disco: retorna una función que aplica sobre worksheets, para usarla en scripts específicos.
 *
 * @param {object} opts
 *  - fromCol: letra o índice 1-based (p.ej "E" o 5)
 *  - toCol:   letra o índice 1-based (p.ej "K" o 11)
 *  - keySelectorFrom(row) -> string : cómo construimos la clave en la hoja origen
 *  - keySelectorTo(row) -> string   : cómo construimos la clave en la hoja destino
 *  - transform(value) -> any        : opcional, para parsear (ej: parsePrecio)
 */
function makeColumnMapper(opts = {}) {
  const fromColIdx = typeof opts.fromCol === "string" ? colLetterToIndex(opts.fromCol) : Number(opts.fromCol);
  const toColIdx = typeof opts.toCol === "string" ? colLetterToIndex(opts.toCol) : Number(opts.toCol);
  if (!fromColIdx || !toColIdx) throw new Error("[makeColumnMapper] fromCol/toCol inválidos");

  const transform = typeof opts.transform === "function" ? opts.transform : (v) => v;

  return function applyMapColumn(worksheetFrom, worksheetTo) {
    if (!worksheetFrom || !worksheetTo) throw new Error("[makeColumnMapper] worksheets inválidos");

    // construir índice en memoria desde hoja origen
    const index = new Map();
    for (let r = 2; r <= worksheetFrom.rowCount; r++) {
      const row = worksheetFrom.getRow(r);
      const key = String(opts.keySelectorFrom(row) || "").trim();
      if (!key) continue;
      const cellVal = readCellText(row.getCell(fromColIdx));
      index.set(key, cellVal);
    }

    // aplicar sobre hoja destino
    let applied = 0;
    for (let r = 2; r <= worksheetTo.rowCount; r++) {
      const row = worksheetTo.getRow(r);
      const key = String(opts.keySelectorTo(row) || "").trim();
      if (!key) continue;
      if (index.has(key)) {
        const raw = index.get(key);
        const val = transform(raw);
        if (val != null && val !== "") {
          row.getCell(toColIdx).value = val;
          applied++;
        }
      }
    }
    return { applied, total: worksheetTo.rowCount - 1 };
  };
}

module.exports = {
  // headers / orden / casting
  HEADERS_JSON,
  normalizeHeader,
  HEADER_MAP,
  PREFERRED_ORDER,
  toSnakeCase,
  sortKeys,
  mapHeadersFromRow,

  // números
  parsePrecio,
  round2,
  castValue,

  // fs
  ensureDir,

  // excel
  toKey,
  buildHeaderIndex,
  buildHeaderIndexCanon,
  readCellText,
  colLetterToIndex,
  colIndexToLetter,
  getWorksheetByNameOrFirst,
  makeColumnMapper,

  // imágenes
  normalizeImagenPath,
  scanImages,
  bestFuzzyMatch,
  normName,
  tokensOf,
  tokenOverlapScore,
};

/* fin */
