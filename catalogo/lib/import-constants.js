// D:\empresas\catalogo\lib\import-constants.js
import headers from "@/lib/headers.json";

// Normaliza: minúsculas, sin acentos, separadores a "_", colapsa múltiples "_"
export function normalizeHeaderKey(label) {
  if (label === null || label === undefined) return "";
  const lower = String(label).trim().toLowerCase();
  if (!lower) return "";
  const noAccents = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const replaced = noAccents.replace(/[^a-z0-9]+/g, "_");
  const collapsed = replaced.replace(/_+/g, "_").replace(/^_|_$/g, "");
  return collapsed;
}

const HEADER_ALIASES = headers.aliases || {};
export const DEFAULT_ALLOWED = Object.freeze(headers.defaultAllowed || []);
export const PREFERRED_ORDER = Object.freeze(headers.preferredOrder || []);

// Construimos HEADER_MAP canónico con normalización
export const HEADER_MAP = Object.freeze(
  Object.entries(HEADER_ALIASES).reduce((acc, [canonical, list]) => {
    for (const variant of list) {
      const norm = normalizeHeaderKey(variant);
      if (norm) acc[norm] = canonical;
    }
    return acc;
  }, {})
);

// Dada una etiqueta cruda, devuelve la clave canónica final
export function getCanonicalHeader(label) {
  const norm = normalizeHeaderKey(label);
  if (!norm) return "";
  return HEADER_MAP[norm] || norm;
}

// Útil para validaciones rápidas o UI de mapping
export const CANONICAL_FIELDS = Object.freeze(
  Array.from(new Set(Object.values(HEADER_MAP)))
);
