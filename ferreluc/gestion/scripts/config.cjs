// D:\empresas\ferreluc\gestion\scripts\config.cjs
// Centraliza rutas, políticas de cálculo y parámetros de normalización
// para TODOS los .cjs. Si mañana movés el proyecto de disco, solo tocás acá.

const path = require("path");

// Podés sobreescribir el root por ENV si corrés en otra máquina
const ROOT =
  process.env.GESTION_ROOT?.replace(/\\/g, "/") ||
  "D:/empresas/ferreluc/gestion";

const LISTAS = `${ROOT}/listas`;
const NORMALIZADAS_GRAIS = `${LISTAS}/normalizadas/grais`;
const ORIGINALES_GRAIS = `${LISTAS}/originales/grais`;
const IMG_DIR = `${ROOT}/imagenes`;
const JSON_DIR = `${ROOT}/json`;
const REPORTES_DIR = `${NORMALIZADAS_GRAIS}/reportes`;

// helper chiquito para rutas relativas al ROOT
function fromRoot(...segs) {
  return path
    .resolve(ROOT, ...segs)
    .replace(/\\/g, "/");
}

const RUTAS = {
  // Excel origen (crudo del proveedor)
  ORIGEN_XLSX: `${ORIGINALES_GRAIS}/data.xlsx`,

  // Excel destino (el que tocan todos los scripts)
  DESTINO_XLSX: `${NORMALIZADAS_GRAIS}/data.xlsx`,

  // Reportes
  REPORTE_DIR: REPORTES_DIR,
  REPORTE_XLSX: `${REPORTES_DIR}/no_encontrados.xlsx`,

  // Imágenes
  IMAGES_DIR: IMG_DIR,
  // Esto es ruta física; los scripts de imagen la van a mapear a /imagenes/...
  FALLBACK_IMG: `${IMG_DIR}/sin_imagen.png`,

  // JSON de salida (para el catálogo)
  OUTPUT_DIR: JSON_DIR,
  OUTPUT_PATH: `${JSON_DIR}/producto_grais.json`,
};

// Política de cálculos (por si cambia IVA/markup)
const CALC = {
  // IVA del proveedor / país
  IVA: Number(process.env.CALC_IVA ?? 0.21),
  // Margen que querés sobre costo (40% por defecto)
  GANANCIA: Number(process.env.CALC_GANANCIA ?? 0.4),
};

// Dónde está el headers.json del otro proyecto (el Next)
// Esto lo usan los helpers para mapear columnas.
const HEADERS_JSON_CANDIDATES = [
  process.env.HEADERS_JSON_PATH &&
    path.resolve(process.env.HEADERS_JSON_PATH),
  // ruta fija que ya usabas
  "D:/empresas/catalogo/lib/headers.json",
  // por si estás parado en el repo de catálogo
  path.resolve(process.cwd(), "lib", "headers.json"),
]
  .filter(Boolean)
  .map((p) => String(p).replace(/\\/g, "/"));

// Parámetros genéricos reutilizables por los scripts
const PARAMS = {
  // umbral global para fuzzy de imágenes
  IMAGE_FUZZY_THRESHOLD: Number(process.env.IMAGE_FUZZY_THRESHOLD ?? 0.55),

  // columnas por defecto en el Excel destino
  DEFAULT_COLUMNS: {
    IMAGEN: process.env.COL_IMAGEN || "imagen",
    CATEGORIA: process.env.COL_CATEGORIA || "categoria",
  },

  // si está en true, los scripts de imagen SOLO completan celdas vacías
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
     * Cómo construir la clave para matchear filas entre origen y destino.
     * Por defecto, se usa el contenido de la columna "codigo_flexxus" si existe,
     * o la primera columna como fallback.
     * (La función concreta se implementa en los scripts que llamen a makeColumnMapper).
     */
    KEY_STRATEGY: process.env.PRECIO_VENTA_KEY_STRATEGY || "codigo_flexxus",
    // Sanear y parsear precios al aplicar (true = usa parsePrecio)
    PARSE_PRECIOS: /^true$/i.test(process.env.PRECIO_VENTA_PARSE || "true"),
  },
};

module.exports = {
  ROOT,
  LISTAS,
  RUTAS,
  CALC,
  HEADERS_JSON_CANDIDATES,
  PARAMS,
  fromRoot,
};

/* fin */
