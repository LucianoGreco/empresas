// D:\empresas\catalogo\lib\etl-grais-shared.js
// Módulo único de ETL para Grais en el lado Next.
// Reemplaza la necesidad de tener excel-helpers.js e image-match.js por separado.

import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { CFG, sanitizeImage, ALLOWED_IMAGE_EXTS, ensureDir } from "./config.js";

// ---------------------------------------------
// Helpers de Excel
// ---------------------------------------------
function readWorkbook(absPath) {
  return XLSX.readFile(absPath, { cellDates: false, dense: true });
}

function sheetToJson(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
}

function jsonToSheet(rows) {
  return XLSX.utils.json_to_sheet(rows, { skipHeader: false });
}

function writeWorkbook(wb, absPath) {
  XLSX.writeFile(wb, absPath);
}

// ---------------------------------------------
// Helpers de nombres / fuzzy
// ---------------------------------------------
function stripAccents(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normSpaces(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function toKey(s) {
  return normSpaces(
    stripAccents(String(s || "").toLowerCase())
      .replace(/[._:\/\\]+/g, " ")
      .replace(/[(){}\[\]-]+/g, " ")
      .replace(/[^a-z0-9 ]+/g, " ")
  );
}

function tokens(s) {
  return new Set(toKey(s).split(" ").filter(Boolean));
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const uni = A.size + B.size - inter;
  return uni ? inter / uni : 0;
}

// ---------------------------------------------
// Imágenes
// ---------------------------------------------
function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) =>
      ALLOWED_IMAGE_EXTS.includes(path.extname(f).toLowerCase())
    )
    .map((f) => ({
      name: f,
      base: path.basename(f, path.extname(f)),
      ext: path.extname(f).toLowerCase(),
      abs: path.join(dir, f),
    }));
}

const EXT_SCORE = new Map([
  [".png", 5],
  [".jpg", 4],
  [".jpeg", 4],
  [".webp", 3],
  [".gif", 2],
  [".bmp", 1],
  [".ico", 1],
]);

function* categoryCandidates(category) {
  const raw = String(category || "");
  const low = raw.toLowerCase();
  const noAcc = stripAccents(raw).toLowerCase();
  const coll = normSpaces(low);
  const collNoAcc = normSpaces(noAcc);

  const v = new Set([
    raw,
    low,
    noAcc,
    coll,
    collNoAcc,
    coll.replace(/ /g, "_"),
    coll.replace(/ /g, "-"),
    collNoAcc.replace(/ /g, "_"),
    collNoAcc.replace(/ /g, "-"),
  ]);

  for (const s of v) yield s;
}

// 👇 ESTA era la que faltaba exportar
export function findImageForCategory(category, preferExt = ".png") {
  const dir = CFG.imgsDir;
  const files = listImages(dir);
  if (files.length === 0) return null;

  // 1) literal / variantes
  for (const cand of categoryCandidates(category)) {
    for (const ext of ALLOWED_IMAGE_EXTS) {
      const t = path.join(dir, `${cand}${ext}`);
      if (fs.existsSync(t)) return t;
    }
  }

  // 2) bucket por key normalizada
  const catKey = toKey(category);
  const bucket = files.reduce((acc, f) => {
    const k = toKey(f.base);
    if (!acc.has(k)) acc.set(k, []);
    acc.get(k).push(f);
    return acc;
  }, new Map());

  if (bucket.has(catKey)) {
    const opts = bucket.get(catKey);
    opts.sort(
      (a, b) =>
        (EXT_SCORE.get(b.ext) || 0) - (EXT_SCORE.get(a.ext) || 0) ||
        a.name.length - b.name.length
    );
    return opts[0].abs;
  }

  // 3) fuzzy jaccard
  const toksCat = tokens(category);
  let best = null;
  let bestScore = 0;
  for (const f of files) {
    const score = jaccard(toksCat, tokens(f.base));
    const bias =
      (f.ext === preferExt ? 0.05 : 0) + ((EXT_SCORE.get(f.ext) || 0) / 100);
    const total = score + bias;
    if (total > bestScore) {
      best = f;
      bestScore = total;
    }
  }
  if (best && bestScore >= 0.35) return best.abs;

  return null;
}

// ---------------------------------------------
// Lectura / escritura específicas de Grais
// ---------------------------------------------
const HEADERS_NORMAL = [
  "codigo flexxus",
  "nombre descripcion",
  "costo",
  "venta",
  "mayorista",
  "inventario",
  "inv_minimo",
  "inv_máximo",
  "proveedor",
  "descripcion flexxus",
  "precio venta",
  "caja",
  "iva",
  "ganancia",
  "imagen",
  "marca",
  "categoria",
  "moneda",
];

export function leerOrigen() {
  const wb = readWorkbook(CFG.origenXlsxGrais);
  const first = wb.Sheets[wb.SheetNames[0]];
  return sheetToJson(first);
}

export function leerNormalizada() {
  const wb = readWorkbook(CFG.excelPath);
  const first = wb.Sheets[wb.SheetNames[0]];
  return sheetToJson(first);
}

export function escribirNormalizada(rows) {
  const wb = readWorkbook(CFG.excelPath);
  const name = wb.SheetNames[0];
  const out = rows.map((r) => {
    const o = {};
    for (const h of HEADERS_NORMAL) o[h] = r[h] ?? "";
    return o;
  });
  wb.Sheets[name] = jsonToSheet(out);
  writeWorkbook(wb, CFG.excelPath);
}

export function escribirNoEncontrados(rows) {
  ensureDir(path.dirname(CFG.noEncontradosXlsx));
  const out = rows.map((r) => ({
    PROVEEDOR: r["PROVEEDOR"] ?? "",
    CODIGO: r["CODIGO"] ?? "",
    "CODIGO FLEXXUS": r["CODIGO FLEXXUS"] ?? "-",
    "Descripcion Flexxus": r["Descripcion Flexxus"] ?? "",
    "PRECIO VENTA": r["PRECIO VENTA"] ?? "",
  }));
  const wb = { SheetNames: ["no_encontrados"], Sheets: {} };
  wb.Sheets["no_encontrados"] = jsonToSheet(out);
  writeWorkbook(wb, CFG.noEncontradosXlsx);
  return { path: CFG.noEncontradosXlsx, count: out.length };
}

export function aplicarPrecios() {
  const origen = leerOrigen();
  const noEncontrados = origen.filter((r) => {
    const cf = String(r["CODIGO FLEXXUS"] ?? "").trim();
    return !cf || cf === "-";
  });
  const reporte = escribirNoEncontrados(noEncontrados);

  const norm = leerNormalizada();
  const out = norm.map((r) => {
    const precioVenta = r["precio venta"];
    const caja = Number(r["caja"] ?? 1) || 1;
    const ivaRate = CFG.ivaRate;
    const ganRate = CFG.gananciaRate;

    let costo = r["costo"];
    let venta = r["venta"];
    let iva = r["iva"];
    let gan = r["ganancia"];

    if (precioVenta !== undefined && precioVenta !== "") {
      const unitario =
        Number(String(precioVenta).replace(/\./g, "").replace(/,/g, ".")) /
        caja;
      const unit2 = Number.isFinite(unitario) ? unitario : 0;
      const ivaVal = unit2 * ivaRate;
      const costoIva = unit2 + ivaVal;
      const ventaPub = costoIva * (1 + ganRate);
      costo = Math.round(costoIva * 100) / 100;
      venta = Math.round(ventaPub * 100) / 100;
      iva = Math.round(ivaVal * 100) / 100;
      gan = Math.round(costoIva * ganRate * 100) / 100;
    }

    return {
      ...r,
      costo: costo ?? "",
      venta: venta ?? "",
      iva: iva ?? "",
      ganancia: gan ?? "",
    };
  });

  escribirNormalizada(out);
  return {
    updated: out.length,
    no_encontrados: reporte.count,
    no_encontrados_path: reporte.path,
  };
}

export function colocarImagenes() {
  const norm = leerNormalizada();
  const out = norm.map((r) => {
    const categoria = String(r["categoria"] || "").trim();
    const baseForMatch =
      categoria ||
      String(
        r["nombre descripcion"] || r["descripcion flexxus"] || ""
      ).trim();

    const abs = findImageForCategory(baseForMatch, ".png");
    const finalUrl = sanitizeImage(abs || "/imagenes/sin_imagen.png");
    return { ...r, imagen: finalUrl };
  });
  escribirNormalizada(out);
  return { updated: out.length };
}

export function exportarJson() {
  const rows = leerNormalizada();
  const out = rows.map((r) => ({
    codigo_flexxus: String(r["codigo flexxus"] ?? "").trim(),
    nombre_descripcion: String(r["nombre descripcion"] ?? "").trim(),
    costo: Number(r["costo"] ?? 0) || 0,
    venta: Number(r["venta"] ?? 0) || 0,
    mayorista: Number(r["mayorista"] ?? 0) || 0,
    inventario: Number(r["inventario"] ?? 0) || 0,
    inv_minimo: Number(r["inv_minimo"] ?? 0) || 0,
    inv_maximo: Number(r["inv_máximo"] ?? 0) || 0,
    proveedor: String(r["proveedor"] ?? "").trim(),
    descripcion_flexxus: String(r["descripcion flexxus"] ?? "").trim(),
    precio_venta: Number(r["precio venta"] ?? 0) || 0,
    caja: String(r["caja"] ?? "").trim(),
    iva: Number(r["iva"] ?? 0) || 0,
    ganancia: Number(r["ganancia"] ?? 0) || 0,
    imagen: sanitizeImage(String(r["imagen"] ?? "").trim()),
    marca: String(r["marca"] ?? "").trim(),
    categoria: String(r["categoria"] ?? "").trim(),
    moneda: String(r["moneda"] ?? "").trim() || "ars",
  }));

  ensureDir(CFG.jsonDir);
  fs.writeFileSync(CFG.jsonPath, JSON.stringify(out, null, 2), "utf-8");
  return { path: CFG.jsonPath, count: out.length };
}

export function preview() {
  const origen = leerOrigen();
  const norm = leerNormalizada();
  const missing = origen.filter((r) => {
    const cf = String(r["CODIGO FLEXXUS"] ?? "").trim();
    return !cf || cf === "-";
  });
  return {
    origen_total: origen.length,
    normalizada_total: norm.length,
    no_encontrados: missing.length,
    sample_normalizada: norm.slice(0, 5),
    sample_origen: origen.slice(0, 5),
  };
}

export function runAll() {
  const p1 = aplicarPrecios();
  const p2 = colocarImagenes();
  const p3 = exportarJson();
  return { precios: p1, imagenes: p2, json: p3 };
}
