// lib/config.js
import fs from "fs";
import path from "path";

export const CFG = {
  // === LISTAS EXCEL ===
  // Origen (descarga del proveedor)
  origenXlsxGrais:
    process.env.GESTION_ORIGEN_XLSX_GRAIS ||
    "D:\\empresas\\ferreluc\\gestion\\listas\\originales\\grais\\data.xlsx",

  // Normalizada (tu hoja de trabajo)
  excelPath:
    process.env.GESTION_EXCEL_PATH ||
    "D:\\empresas\\ferreluc\\gestion\\listas\\normalizadas\\grais\\data.xlsx",

  // === REPORTES ===
  reportDir:
    process.env.GESTION_REPORT_DIR ||
    "D:\\empresas\\ferreluc\\gestion\\listas\\normalizadas\\grais\\reportes",
  noEncontradosXlsx:
    process.env.GESTION_NO_ENC_XLSX ||
    "D:\\empresas\\ferreluc\\gestion\\listas\\normalizadas\\grais\\reportes\\no_encontrados.xlsx",

  // === SALIDA JSON PARA CATALOGO ===
  jsonDir:
    process.env.GESTION_JSON_DIR ||
    "D:\\empresas\\ferreluc\\gestion\\json",
  jsonPath:
    process.env.GESTION_JSON_PATH ||
    "D:\\empresas\\ferreluc\\gestion\\json\\producto_grais.json",

  // === IMAGENES ===
  imgsDir:
    process.env.GESTION_IMGS_DIR ||
    "D:\\empresas\\ferreluc\\gestion\\imagenes",

  // === AUTH ADMIN ===
  adminToken: process.env.ADMIN_TOKEN || "",
  adminCookieName: process.env.AUTH_COOKIE_NAME || "admin_token",

  // === REGLAS DE CALCULO ===
  ivaRate: Number(process.env.GESTION_IVA_RATE ?? 0.21),
  gananciaRate: Number(process.env.GESTION_GANANCIA_RATE ?? 0.40),
};

// Whitelist centralizada de extensiones de imagen aceptadas
export const ALLOWED_IMAGE_EXTS = Object.freeze([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".ico",
]);

export function ensureDir(absPath) {
  try { fs.mkdirSync(absPath, { recursive: true }); } catch { /* noop */ }
}

export function toWin(p) { return String(p || "").replace(/\//g, "\\"); }
export function toPosix(p) { return String(p || "").replace(/\\/g, "/"); }

/**
 * Normaliza el campo imagen del JSON hacia una URL servida por /imagenes/...
 * Acepta rutas absolutas/relativas, limpia prefijos viejos y valida extensión.
 * Devuelve siempre "/imagenes/<archivo>" (o "/imagenes/sin_imagen.png").
 */
export function sanitizeImage(val, imgsDir = CFG.imgsDir) {
  if (!val) return "/imagenes/sin_imagen.png";
  let s = String(val).trim();
  if (!s) return "/imagenes/sin_imagen.png";

  // URLs absolutas
  if (/^https?:\/\//i.test(s)) return s;

  // Normalizamos slashes
  s = s.replace(/\\/g, "/");

  // Prefijos viejos
  if (s.startsWith("/_imagenes_")) s = s.replace(/^\/_imagenes_/, "/imagenes/");
  if (s.startsWith("_imagenes_")) s = s.replace(/^_imagenes_/, "imagenes/");

  const lowerAll = s.toLowerCase();

  // Ya es /imagenes/...
  if (lowerAll.startsWith("/imagenes/")) {
    const fname = s.split("/").slice(-1)[0].toLowerCase();
    const ext = path.extname(fname).toLowerCase();
    return ALLOWED_IMAGE_EXTS.includes(ext) ? `/imagenes/${fname}` : "/imagenes/sin_imagen.png";
  }
  if (lowerAll.startsWith("imagenes/")) {
    const fname = s.split("/").slice(-1)[0].toLowerCase();
    const ext = path.extname(fname).toLowerCase();
    return ALLOWED_IMAGE_EXTS.includes(ext) ? `/${lowerAll}` : "/imagenes/sin_imagen.png";
  }

  // Path absoluto de Windows a la carpeta oficial
  const imgsNorm = toPosix(String(imgsDir || ""));
  const imgsLower = imgsNorm.toLowerCase().replace(/^[a-z]:\//, "");
  if (/^[a-z]:\//i.test(lowerAll)) {
    const trimmed = lowerAll.replace(/^[a-z]:\//i, "");
    if (imgsLower && trimmed.startsWith(imgsLower + "/")) {
      const fname = s.split("/").slice(-1)[0].toLowerCase();
      const ext = path.extname(fname).toLowerCase();
      return ALLOWED_IMAGE_EXTS.includes(ext) ? `/imagenes/${fname}` : "/imagenes/sin_imagen.png";
    }
  }

  // Cualquier .../gestion/imagenes/...
  if (lowerAll.includes("/gestion/imagenes/")) {
    const fname = s.split("/").slice(-1)[0].toLowerCase();
    const ext = path.extname(fname).toLowerCase();
    return ALLOWED_IMAGE_EXTS.includes(ext) ? `/imagenes/${fname}` : "/imagenes/sin_imagen.png";
  }

  // Nombre o relativo → /imagenes/...
  const fname = s.split("/").slice(-1)[0].toLowerCase();
  const ext = path.extname(fname).toLowerCase();
  return ALLOWED_IMAGE_EXTS.includes(ext) ? `/imagenes/${fname}` : "/imagenes/sin_imagen.png";
}

/* fin */
