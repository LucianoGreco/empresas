import fs from "fs";
import path from "path";

export const CFG = {
  // === LISTAS EXCEL ===
  origenXlsxGrais:
    process.env.GESTION_ORIGEN_XLSX_GRAIS ||
    "D:\\empresas\\ferreluc\\gestion\\listas\\originales\\grais\\data.xlsx",

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

  // === REGLAS DE CALCULO (solo catálogo; la pipeline usa su propio CALC) ===
  ivaRate: Number(process.env.GESTION_IVA_RATE ?? 0.21),
  gananciaRate: Number(process.env.GESTION_GANANCIA_RATE ?? 0.40),
};

export const ALLOWED_IMAGE_EXTS = Object.freeze([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".ico",
]);

export function ensureDir(absPath) {
  try { fs.mkdirSync(absPath, { recursive: true }); } catch {}
}
export function toWin(p) { return String(p || "").replace(/\//g, "\\"); }
export function toPosix(p) { return String(p || "").replace(/\\/g, "/"); }

// === Utils internos de imagen ===
function lowerExt(fname) {
  const ext = path.extname(fname || "").toLowerCase();
  const base = path.basename(fname || "", ext);
  return { base, ext };
}
function fileNameFromAnyPath(p) {
  const s = String(p || "").replace(/\\/g, "/");
  const parts = s.split("/");
  return parts[parts.length - 1] || "";
}

/**
 * Normaliza una referencia de imagen a un path web:
 *  - Mantiene URLs http(s)
 *  - Acepta rutas ya bajo /imagenes, "imagenes/", o paths absolutos bajo CFG.imgsDir
 *  - Case-insensitive y tolerante a UNC / Windows
 *  - Valida extensión contra ALLOWED_IMAGE_EXTS
 */
export function sanitizeImage(val, imgsDir = CFG.imgsDir) {
  if (!val) return "/imagenes/sin_imagen.png";
  let s = String(val).trim();
  if (!s) return "/imagenes/sin_imagen.png";

  // URL absoluta → dejar pasar
  if (/^https?:\/\//i.test(s)) return s;

  // Normalizar separadores
  s = s.replace(/\\/g, "/");

  // Normalizar alias comunes
  if (s.startsWith("/_imagenes_")) s = s.replace(/^\/_imagenes_/, "/imagenes/");
  if (s.startsWith("_imagenes_")) s = s.replace(/^_imagenes_/, "imagenes/");

  const lowerAll = s.toLowerCase();

  // Ya en /imagenes o imagenes/
  if (lowerAll.startsWith("/imagenes/") || lowerAll.startsWith("imagenes/")) {
    const fname = fileNameFromAnyPath(s).toLowerCase();
    const { ext } = lowerExt(fname);
    return ALLOWED_IMAGE_EXTS.includes(ext) ? `/imagenes/${fname}` : "/imagenes/sin_imagen.png";
  }

  // Si es un path absoluto (Windows o POSIX), ver si cae dentro de imgsDir
  const imgsNorm = String(imgsDir || "").replace(/\\/g, "/");
  const imgsLower = imgsNorm.toLowerCase()
    .replace(/^([a-z]):\//i, "/$1/") // D:/ → /d/
    .replace(/^\/+/, "/");

  // Normalizar Windows drive para comparar "case-insensitive"
  const valLower = lowerAll
    .replace(/^([a-z]):\//i, "/$1/")
    .replace(/^\/+/, "/");

  if (imgsLower && valLower.startsWith(imgsLower.replace(/^([a-z]):\//i, "/$1/"))) {
    const fname = fileNameFromAnyPath(s).toLowerCase();
    const { ext } = lowerExt(fname);
    return ALLOWED_IMAGE_EXTS.includes(ext) ? `/imagenes/${fname}` : "/imagenes/sin_imagen.png";
  }

  // Cualquier otra ruta: tomar solo el nombre de archivo
  const fname = fileNameFromAnyPath(s).toLowerCase();
  const { ext } = lowerExt(fname);
  return ALLOWED_IMAGE_EXTS.includes(ext) ? `/imagenes/${fname}` : "/imagenes/sin_imagen.png";
}
