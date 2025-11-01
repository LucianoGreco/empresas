// D:\empresas\ferreluc\gestion\scripts\config.cjs
// Centraliza rutas y políticas de cálculo para TODOS los .cjs
// Si mañana movés el proyecto de disco, solo tocás acá.

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

module.exports = {
  ROOT,
  LISTAS,
  RUTAS: {
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
  },

  // Política de cálculos (por si cambia IVA/markup)
  CALC: {
    // IVA del proveedor / país
    IVA: Number(process.env.CALC_IVA ?? 0.21),
    // Margen que querés sobre costo (40% por defecto)
    GANANCIA: Number(process.env.CALC_GANANCIA ?? 0.4),
  },

  // Dónde está el headers.json del otro proyecto (el Next)
  // Esto lo usan los helpers para mapear columnas.
  HEADERS_JSON_CANDIDATES: [
    process.env.HEADERS_JSON_PATH &&
      path.resolve(process.env.HEADERS_JSON_PATH),
    "D:/empresas/catalogo/lib/headers.json",
    path.resolve(process.cwd(), "lib", "headers.json"),
  ].filter(Boolean),
};
