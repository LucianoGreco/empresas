// D:\empresas\catalogo\lib\import-service.js
import {
  HEADER_MAP,
  DEFAULT_ALLOWED,
  PREFERRED_ORDER,
  getCanonicalHeader,
} from "./import-constants.js";
import { validateRow } from "./validate.js";
import { sanitizeImage, CFG } from "./config.js";
import { tryReadJson, saveJson } from "./catalog.js";
// 👇 antes: "./image-match.js" (BORRAR) → ahora usamos el shared
import { findImageForCategory } from "./etl-grais-shared.js";

/** --- Headers --- */
export function normalizeHeaders(rawHeaders = []) {
  return rawHeaders.map((h) => getCanonicalHeader(h));
}

/** allowed: csv|array; "*" = todo permitido */
export function resolveAllowed(allowedCsvOrArray) {
  if (
    !allowedCsvOrArray ||
    (Array.isArray(allowedCsvOrArray) && allowedCsvOrArray.length === 0)
  ) {
    return new Set(DEFAULT_ALLOWED);
  }
  const arr = Array.isArray(allowedCsvOrArray)
    ? allowedCsvOrArray
    : String(allowedCsvOrArray)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  if (arr.includes("*")) return null; // null => sin límite
  return new Set(arr);
}

/** proyección según allowed */
export function pickAllowed(obj, allowedSet) {
  if (!allowedSet) return { ...obj };
  const out = {};
  for (const k of Object.keys(obj)) if (allowedSet.has(k)) out[k] = obj[k];
  return out;
}

/** orden preferido de claves */
export function orderKeysPreferred(obj) {
  const out = {};
  const pref = new Set(PREFERRED_ORDER);
  for (const k of PREFERRED_ORDER) if (obj[k] !== undefined) out[k] = obj[k];
  const rest = Object.keys(obj)
    .filter((k) => !pref.has(k))
    .sort();
  for (const k of rest) out[k] = obj[k];
  return out;
}

/** decide si la imagen está “vacía” o es el fallback */
function isEmptyOrFallbackImage(val) {
  if (!val) return true;
  const s = String(val).trim().toLowerCase().replace(/\\/g, "/");
  if (!s) return true;
  return s.endsWith("/sin_imagen.png") || s.endsWith("\\sin_imagen.png");
}

/**
 * Construye una fila canónica desde:
 *  - arrays + headersCanon, o
 *  - objeto con headers crudos
 * Además:
 *  - sanitizea imagen -> /imagenes/*
 *  - si la imagen está vacía/fallback, intenta asignar por categoría usando findImageForCategory()
 */
export function buildCanonicalRow(input, headersCanon = null) {
  let obj = {};
  if (Array.isArray(input) && Array.isArray(headersCanon)) {
    headersCanon.forEach((key, idx) => {
      if (key) obj[key] = input[idx];
    });
  } else if (input && typeof input === "object" && !Array.isArray(input)) {
    obj = Object.fromEntries(
      Object.entries(input).map(([k, v]) => [getCanonicalHeader(k), v])
    );
  } else {
    return null;
  }

  // Sanear imagen inicial
  if (obj.imagen) {
    try {
      obj.imagen = sanitizeImage(obj.imagen);
    } catch {
      /* noop */
    }
  }

  // Si imagen vacía/fallback -> buscar por categoría
  const cat = (
    obj.categoria ??
    obj.nombre_descripcion ??
    obj.descripcion_flexxus ??
    ""
  )
    .toString()
    .trim();

  if (isEmptyOrFallbackImage(obj.imagen) && cat) {
    // usa el mismo motor de imagen que la pipeline de Grais
    const abs = findImageForCategory(cat, ".png");
    if (abs) obj.imagen = sanitizeImage(abs);
    else obj.imagen = "/imagenes/sin_imagen.png";
  } else {
    // asegurar formato final aunque venga con ruta absoluta válida
    obj.imagen = sanitizeImage(obj.imagen);
  }

  // Validación/coerción
  const res = validateRow(obj);
  if (!res.ok) return { errors: res.errors, data: null };
  return { errors: [], data: res.data };
}

/** clave primaria preferida para merge */
export function getKey(row) {
  if (row.sku) return `sku:${row.sku}`;
  if (row.codigo_flexxus) return `flex:${row.codigo_flexxus}`;
  if (row.nombre_descripcion)
    return `nom:${row.nombre_descripcion.toLowerCase()}`;
  return null;
}

/** merge por clave primaria (merge|replace) */
export function mergeCatalog(
  existingList = [],
  incomingList = [],
  strategy = "merge",
  options = {}
) {
  const { onlyOverwriteAllowed = false, allowedSet = null } = options;

  if (strategy === "replace") return incomingList.slice();

  const map = new Map();
  for (const item of existingList) {
    const key = getKey(item);
    if (key) map.set(key, { ...item });
  }

  for (const inc of incomingList) {
    const key = getKey(inc);
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, { ...inc });
      continue;
    }

    const prev = map.get(key);
    if (!onlyOverwriteAllowed || !allowedSet) {
      map.set(key, { ...prev, ...inc });
    } else {
      const merged = { ...prev };
      for (const k of Object.keys(inc))
        if (allowedSet.has(k)) merged[k] = inc[k];
      map.set(key, merged);
    }
  }

  return Array.from(map.values());
}

/**
 * Pipeline de import para el endpoint:
 *  - normaliza headers (si vienen)
 *  - mapea filas
 *  - filtra allowed
 *  - valida
 *  - ordena claves
 *  - merge/replace
 *  - guarda JSON
 *  - (clave) resuelve imagen por categoría si venía vacía/fallback
 */
export async function runImportPipeline({
  rows, // array de objetos (headers crudos) o arrays
  headers, // array canónico si rows son arrays; si rows son objetos, dejar null
  allowed, // csv|array; "*" para todo; por defecto DEFAULT_ALLOWED
  strategy = "merge", // "merge" | "replace"
}) {
  const allowedSet = resolveAllowed(allowed);
  const headersCanon = headers ? normalizeHeaders(headers) : null;

  const incoming = [];
  const stats = {
    total: 0,
    valid: 0,
    invalid: 0,
    errors: [],
    discardedByAllowed: 0,
  };

  for (const row of rows) {
    stats.total += 1;
    const { data, errors } = buildCanonicalRow(row, headersCanon);
    if (errors?.length) {
      stats.invalid += 1;
      if (stats.errors.length < 100)
        stats.errors.push({ row: stats.total, errors });
      continue;
    }
    if (!data) continue;

    const projected = pickAllowed(data, allowedSet);
    if (Object.keys(projected).length === 0) {
      stats.discardedByAllowed += 1;
      continue;
    }

    const ordered = orderKeysPreferred(projected);
    incoming.push(ordered);
    stats.valid += 1;
  }

  const current = tryReadJson(CFG.jsonPath) || [];
  const merged = mergeCatalog(current, incoming, strategy, {
    onlyOverwriteAllowed: Boolean(allowedSet),
    allowedSet,
  });

  const finalList = merged.map(orderKeysPreferred);
  saveJson(CFG.jsonPath, finalList);

  return { count: finalList.length, path: CFG.jsonPath, stats };
}
