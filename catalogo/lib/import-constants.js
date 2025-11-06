// D:\empresas\catalogo\lib\import-constants.js
import headers from "@/lib/headers.json";

/**
 * Normaliza una etiqueta de header a una clave estable:
 * - minúsculas
 * - sin acentos
 * - no alfanumérico -> "_"
 * - colapsa múltiples "_" y recorta extremos
 */
export function normalizeHeaderKey(label) {
  if (label === null || label === undefined) return "";
  const lower = String(label).trim().toLowerCase();
  if (!lower) return "";
  const noAccents = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const replaced = noAccents.replace(/[^a-z0-9]+/g, "_");
  const collapsed = replaced.replace(/_+/g, "_").replace(/^_|_$/g, "");
  return collapsed;
}

// Fallbacks defensivos si headers.json viniera incompleto (o con campos faltantes)
const SAFE_ALIASES = (headers && headers.aliases) || {};
export const DEFAULT_ALLOWED = Object.freeze((headers && headers.defaultAllowed) || []);
export const PREFERRED_ORDER = Object.freeze((headers && headers.preferredOrder) || []);

/**
 * Construimos un mapa canónico:
 * - Para cada alias dado en headers.json → canonical
 * - También mapeamos el propio nombre canónico (y su normalizado) a sí mismo,
 *   para tolerar inputs que ya vengan en snake_case.
 */
const map = {};
for (const [canonical, list] of Object.entries(SAFE_ALIASES)) {
  // 1) aliases definidos
  if (Array.isArray(list)) {
    for (const variant of list) {
      const norm = normalizeHeaderKey(variant);
      if (norm) map[norm] = canonical;
    }
  }
  // 2) autopassthrough del canónico (tanto crudo como normalizado)
  const canNorm = normalizeHeaderKey(canonical);
  if (canNorm) {
    map[canNorm] = canonical;         // "precio_venta" -> "precio_venta"
    map[canonical] = canonical;       // por si ya viene exacto
  }
}

export const HEADER_MAP = Object.freeze(map);

/**
 * Dada una etiqueta cruda, devuelve la clave canónica final
 * Si no hay alias conocido, retorna la versión normalizada.
 */
export function getCanonicalHeader(label) {
  const norm = normalizeHeaderKey(label);
  if (!norm) return "";
  return HEADER_MAP[norm] || norm;
}

/** Útil para validaciones rápidas o UI de mapping */
export const CANONICAL_FIELDS = Object.freeze(
  Array.from(new Set(Object.values(HEADER_MAP)))
);
