// D:\empresas\ferreluc\gestion\scripts\config.cjs
// Centraliza rutas, políticas de cálculo y parámetros de normalización
// para TODOS los .cjs. Si mañana movés el proyecto de disco, solo tocás acá.

"use strict";

const fs = require("fs");
const path = require("path");

// ───────────────────────── helpers internas ─────────────────────────
function normalizeFsPath(p) {
  return String(p || "").replace(/\\/g, "/");
}

// intenta cargar dotenv si existe algún .env cercano
(function loadDotenvIfPresent() {
  try {
    const dotenv = require("dotenv");
    // busca .env en gestion/ y en gestion/scripts/
    const candidates = [
      path.resolve(__dirname, "../.env"),
      path.resolve(__dirname, ".env"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        dotenv.config({ path: p });
        break;
      }
    }
  } catch {
    // opcional, no obligatorio
  }
})();

// ───────────────────────── ROOT ─────────────────────────
// Preferí ENV. Si no, usa la carpeta padre de /scripts como raíz.
// Mantengo el hardcode como último fallback por compatibilidad.
const ROOT = normalizeFsPath(
  process.env.GESTION_ROOT ||
    path.resolve(__dirname, "..") ||
    "D:/empresas/ferreluc/gestion"
);

// ───────────────────────── Rutas derivadas ─────────────────────────
const LISTAS = `${ROOT}/listas`;
const NORMALIZADAS_GRAIS = `${LISTAS}/normalizadas/grais`;
const ORIGINALES_GRAIS = `${LISTAS}/originales/grais`;
const IMG_DIR = `${ROOT}/imagenes`;
const JSON_DIR = `${ROOT}/json`;
const REPORTES_DIR = `${NORMALIZADAS_GRAIS}/reportes`;

// helper para rutas relativas al ROOT
function fromRoot(...segs) {
  return normalizeFsPath(path.resolve(ROOT, ...segs));
}

// ───────────────────────── Config de rutas ─────────────────────────
const RUTAS = {
  // Excel origen (crudo del proveedor)
  ORIGEN_XLSX: `${ORIGINALES_GRAIS}/data.xlsx`,

  // Excel destino (el que tocan todos los scripts)
  DESTINO_XLSX: `${NORMALIZADAS_GRAIS}/data.xlsx`,

  // Reportes
  REPORTE_DIR: REPORTES_DIR,
  REPORTE_XLSX: `${REPORTES_DIR}/no_encontrados.xlsx`,

  // Imágenes (ruta física en disco)
  IMAGES_DIR: IMG_DIR,
  // Los scripts mapean esto a /imagenes/sin_imagen.png para la web
  FALLBACK_IMG: `${IMG_DIR}/sin_imagen.png`,

  // JSON de salida (para el catálogo)
  OUTPUT_DIR: JSON_DIR,
  OUTPUT_PATH: `${JSON_DIR}/producto_grais.json`,
};

// ───────────────────────── Política de cálculo ─────────────────────────
// NOTA: usar decimales con punto en ENV (ej: 0.21, 0.4)
const CALC = {
  IVA: Number(process.env.CALC_IVA ?? 0.21),
  GANANCIA: Number(process.env.CALC_GANANCIA ?? 0.4),
};

// ───────────────────────── headers.json de catálogo ─────────────────────────
// Orden de candidatos:
// 1) HEADERS_JSON_PATH explícito por ENV
// 2) repo de catálogo relativo al cwd actual
// 3) repo de catálogo relativo a la raíz de gestión
// 4) hardcode histórico (compat)
const HEADERS_JSON_CANDIDATES = [
  process.env.HEADERS_JSON_PATH && path.resolve(process.env.HEADERS_JSON_PATH),
  path.resolve(process.cwd(), "lib", "headers.json"),
  fromRoot("../catalogo/lib/headers.json"),
  "D:/empresas/catalogo/lib/headers.json",
]
  .filter(Boolean)
  .map((p) => normalizeFsPath(p));

// ───────────────────────── Parámetros generales ─────────────────────────
const PARAMS = {
  // umbral global para fuzzy de imágenes [0..1]
  IMAGE_FUZZY_THRESHOLD: Number(process.env.IMAGE_FUZZY_THRESHOLD ?? 0.55),

  // columnas por defecto en el Excel destino
  DEFAULT_COLUMNS: {
    IMAGEN: process.env.COL_IMAGEN || "imagen",
    CATEGORIA: process.env.COL_CATEGORIA || "categoria",
  },

  // cuando true, los scripts de imagen SOLO completan celdas vacías
  IMAGES_ONLY_EMPTY: /^true$/i.test(process.env.IMAGES_ONLY_EMPTY || ""),

  // === Soporte al mapeo "Precio Venta (E) -> (K)" por UI ===
  MAPEO_PRECIO_VENTA: {
    // letra o índice 1-based en ORIGEN (Grais proveedor)
    ORIG_COL: process.env.PRECIO_VENTA_ORIG_COL || "E",
    // letra o índice 1-based en DESTINO (normalizada)
    DEST_COL: process.env.PRECIO_VENTA_DEST_COL || "K",
    // nombre de hoja; si no existe se usará la primera
    SHEET_ORIG: process.env.PRECIO_VENTA_SHEET_ORIG || "",
    SHEET_DEST: process.env.PRECIO_VENTA_SHEET_DEST || "",
    /**
     * Clave para matchear filas entre origen y destino.
     * Por defecto se usa "codigo_flexxus". Los scripts definen la función.
     */
    KEY_STRATEGY:
      process.env.PRECIO_VENTA_KEY_STRATEGY || "codigo_flexxus",
    // Sanear y parsear precios al aplicar
    PARSE_PRECIOS: /^true$/i.test(process.env.PRECIO_VENTA_PARSE || "true"),
  },
};

// Export
module.exports = {
  ROOT,
  LISTAS,
  RUTAS,
  CALC,
  HEADERS_JSON_CANDIDATES,
  PARAMS,
  fromRoot,
};
