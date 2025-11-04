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

  // === REGLAS DE CALCULO ===
  ivaRate: Number(process.env.GESTION_IVA_RATE ?? 0.21),
  gananciaRate: Number(process.env.GESTION_GANANCIA_RATE ?? 0.40),
};

export const ALLOWED_IMAGE_EXTS = Object.freeze([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".ico",
]);

export function ensureDir(absPath) { try { fs.mkdirSync(absPath, { recursive: true }); } catch {} }
export function toWin(p) { return String(p || "").replace(/\//g, "\\"); }
export function toPosix(p) { return String(p || "").replace(/\\/g, "/"); }

export function sanitizeImage(val, imgsDir = CFG.imgsDir) {
  if (!val) return "/imagenes/sin_imagen.png";
  let s = String(val).trim();
  if (!s) return "/imagenes/sin_imagen.png";
  if (/^https?:\/\//i.test(s)) return s;
  s = s.replace(/\\/g, "/");
  if (s.startsWith("/_imagenes_")) s = s.replace(/^\/_imagenes_/, "/imagenes/");
  if (s.startsWith("_imagenes_")) s = s.replace(/^_imagenes_/, "imagenes/");
  const lowerAll = s.toLowerCase();
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
  const imgsNorm = String(imgsDir || "").replace(/\\/g, "/");
  const imgsLower = imgsNorm.toLowerCase().replace(/^[a-z]:\//, "");
  if (/^[a-z]:\//i.test(lowerAll)) {
    const trimmed = lowerAll.replace(/^[a-z]:\//i, "");
    if (imgsLower && trimmed.startsWith(imgsLower + "/")) {
      const fname = s.split("/").slice(-1)[0].toLowerCase();
      const ext = path.extname(fname).toLowerCase();
      return ALLOWED_IMAGE_EXTS.includes(ext) ? `/imagenes/${fname}` : "/imagenes/sin_imagen.png";
    }
  }
  if (lowerAll.includes("/gestion/imagenes/")) {
    const fname = s.split("/").slice(-1)[0].toLowerCase();
    const ext = path.extname(fname).toLowerCase();
    return ALLOWED_IMAGE_EXTS.includes(ext) ? `/imagenes/${fname}` : "/imagenes/sin_imagen.png";
  }
  const fname = s.split("/").slice(-1)[0].toLowerCase();
  const ext = path.extname(fname).toLowerCase();
  return ALLOWED_IMAGE_EXTS.includes(ext) ? `/imagenes/${fname}` : "/imagenes/sin_imagen.png";
}

/* fin */
