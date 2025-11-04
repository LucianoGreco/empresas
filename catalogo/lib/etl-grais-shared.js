// lib/etl-grais-shared.js
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { CFG, ensureDir, ALLOWED_IMAGE_EXTS } from "./config.js";

/* =========================
   Helpers
   ========================= */
function assertFileReadable(absPath, label = "archivo") {
  const p = String(absPath || "").trim();
  if (!p) {
    const err = new Error(`[ETL] Ruta vacía para ${label}`);
    err.status = 422;
    throw err;
  }
  if (!fs.existsSync(p)) {
    const err = new Error(`[ETL] No existe ${label}: ${p}`);
    err.status = 404;
    throw err;
  }
  try {
    const s = fs.statSync(p);
    if (!s.isFile()) {
      const err = new Error(`[ETL] ${label} no es un archivo: ${p}`);
      err.status = 422;
      throw err;
    }
  } catch {
    const err = new Error(`[ETL] No se pudo acceder a ${label}: ${p}`);
    err.status = 422;
    throw err;
  }
}

function toUNC(p) {
  const win = String(p).replace(/\//g, "\\");
  return win.startsWith("\\\\?\\") ? win : `\\\\?\\${win}`;
}

function readWorkbook(absPath, label = "archivo Excel") {
  assertFileReadable(absPath, label);
  const p = String(absPath);
  try {
    const buf = fs.readFileSync(p);
    return XLSX.read(buf, { type: "buffer", cellDates: false, dense: true });
  } catch (e1) {
    try {
      const buf2 = fs.readFileSync(toUNC(p));
      return XLSX.read(buf2, { type: "buffer", cellDates: false, dense: true });
    } catch (e2) {
      const err = new Error(`[ETL] Falló lectura de ${label}: ${p}`);
      err.status = 422;
      err.cause = e2;
      throw err;
    }
  }
}

function sheetToJson(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
}

function jsonToSheet(rows) {
  return XLSX.utils.json_to_sheet(rows, { skipHeader: false });
}

/** write XLSX atómico: wb → tmp (mismo dir) → rename (con .bak) */
function writeWorkbookAtomic(wb, finalPath, label = "archivo Excel") {
  const outDir = path.dirname(finalPath);
  ensureDir(outDir);

  const base = path.basename(finalPath, path.extname(finalPath));
  const tmp = path.join(outDir, `${base}.tmp.${Date.now()}.xlsx`);
  const bak = path.join(outDir, `${base}.bak.xlsx`);

  try {
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    fs.writeFileSync(tmp, buf);
  } catch (e) {
    const err = new Error(`[ETL] No se pudo escribir tmp para ${label}: ${tmp}`);
    err.status = 500;
    err.cause = e;
    throw err;
  }

  try {
    if (fs.existsSync(finalPath)) {
      try { if (fs.existsSync(bak)) fs.rmSync(bak, { force: true }); } catch {}
      try { fs.renameSync(finalPath, bak); } catch { try { fs.rmSync(finalPath, { force: true }); } catch {} }
    }
    fs.renameSync(tmp, finalPath);
  } catch (e) {
    try { if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true }); } catch {}
    const err = new Error(`[ETL] No se pudo guardar ${label}: ${finalPath}`);
    err.status = 500;
    err.cause = e;
    throw err;
  }
}

/** write JSON atómico */
function writeJsonAtomic(finalPath, data) {
  const outDir = path.dirname(finalPath);
  ensureDir(outDir);
  const base = path.basename(finalPath, path.extname(finalPath));
  const tmp = path.join(outDir, `${base}.tmp.${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  try { if (fs.existsSync(finalPath)) fs.rmSync(finalPath, { force: true }); } catch {}
  fs.renameSync(tmp, finalPath);
}

/* ===== números (coma/pto) robusto =====
   Acepta "$ 12.640,69", "12,640.69", "12640,69", etc. */
function toNumber(x) {
  if (x == null) return 0;
  if (typeof x === "number") return isFinite(x) ? x : 0;
  let s = String(x).trim();
  if (!s) return 0;

  // quitar todo lo que no sea dígito, separadores o signo
  s = s.replace(/[^\d.,\-]/g, "");

  // Si hay ambas "," y ".", detectamos decimal
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // Caso típico es-AR: "12.640,69"  -> quitar miles ".", decimal ","
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(/,/g, ".");
    } else {
      // Caso en-US con miles comma: "12,640.69"
      s = s.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    // Solo coma => usar coma como decimal
    s = s.replace(/\./g, "").replace(/,/g, ".");
  } else {
    // Solo punto o ninguno => quitar separadores de miles (coma) si quedaron
    s = s.replace(/,(?=\d{3}\b)/g, "");
  }

  const n = Number(s);
  return isFinite(n) ? n : 0;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/* === Formato de celdas numéricas (2 decimales) === */
function applyMoneyFormatToSheet(sheet, headers, moneyFields) {
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  // mapa campo → índice de columna
  const colIndex = new Map();
  headers.forEach((h, i) => colIndex.set(h, i));

  const cols = moneyFields
    .map((f) => colIndex.get(f))
    .filter((i) => typeof i === "number");

  for (let r = range.s.r + 1; r <= range.e.r; r++) { // saltear header (fila 1)
    for (const c of cols) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      if (!cell) continue;
      // fuerza número + formato 0.00
      const v = typeof cell.v === "number" ? cell.v : toNumber(cell.v);
      sheet[addr] = { t: "n", v: round2(v), z: "0.00" };
    }
  }
}

/* =========================
   Resolución de rutas (overrides desde UI)
   ========================= */
function resolvePaths(overrides = {}) {
  const origen = overrides.origenPath || overrides.origen || CFG.origenXlsxGrais;
  const destino = overrides.destinoPath || overrides.destino || CFG.excelPath;
  const reporte = overrides.reportePath || overrides.reporte || CFG.noEncontradosXlsx;
  const json = overrides.jsonPath || overrides.json || CFG.jsonPath;
  return { origen, destino, reporte, json };
}

/* =========================
   Imágenes
   ========================= */
function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => ALLOWED_IMAGE_EXTS.includes(path.extname(f).toLowerCase()))
    .map((f) => ({ name: f, base: path.basename(f, path.extname(f)), ext: path.extname(f).toLowerCase(), abs: path.join(dir, f) }));
}
function stripAccents(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
const EXT_SCORE = new Map([[".png",5],[".jpg",4],[".jpeg",4],[".webp",3],[".gif",2],[".bmp",1],[".ico",1]]);
function jaccard(aSet, bSet) {
  let inter = 0;
  for (const t of aSet) if (bSet.has(t)) inter++;
  const uni = aSet.size + bSet.size - inter;
  return uni ? inter / uni : 0;
}
function* categoryCandidates(category) {
  const raw = String(category || "");
  const low = raw.toLowerCase();
  const noAcc = stripAccents(raw).toLowerCase();
  const coll = normSpaces(low);
  const collNoAcc = normSpaces(noAcc);
  const v = new Set([raw,low,noAcc,coll,collNoAcc,coll.replace(/ /g,"_"),coll.replace(/ /g,"-"),collNoAcc.replace(/ /g,"_"),collNoAcc.replace(/ /g,"-")]);
  for (const s of v) yield s;
}
function findImagePathForCategory(category, imgsDir) {
  const files = listImages(imgsDir);
  if (files.length === 0) return null;

  for (const cand of categoryCandidates(category)) {
    for (const f of files) {
      if (f.base.toLowerCase() === cand.toLowerCase()) return f.abs;
    }
    for (const ext of ALLOWED_IMAGE_EXTS) {
      const t = path.join(imgsDir, `${cand}${ext}`);
      if (fs.existsSync(t)) return t;
    }
  }

  const catKey = toKey(category);
  const toksCat = new Set(catKey.split(" ").filter(Boolean));
  let best = null, bestScore = 0;
  for (const f of files) {
    const toks = new Set(toKey(f.base).split(" ").filter(Boolean));
    const score = jaccard(toksCat, toks) + ((EXT_SCORE.get(f.ext)||0)/100);
    if (score > bestScore) { best = f; bestScore = score; }
  }
  return best && bestScore >= 0.35 ? best.abs : null;
}

/* =========================
   Grais I/O
   ========================= */
const HEADERS_NORMAL = [
  "codigo flexxus","nombre descripcion","costo","venta","mayorista","inventario",
  "inv_minimo","inv_máximo","proveedor","descripcion flexxus","precio venta","caja",
  "iva","ganancia","imagen","marca","categoria","moneda",
];

export function leerOrigen(overrides = {}) {
  const { origen } = resolvePaths(overrides);
  const wb = readWorkbook(origen, "Excel ORIGEN (Grais)");
  const first = wb.Sheets[wb.SheetNames[0]];
  return sheetToJson(first);
}

export function leerNormalizada(overrides = {}) {
  const { destino } = resolvePaths(overrides);
  const wb = readWorkbook(destino, "Excel DESTINO (normalizada)");
  const first = wb.Sheets[wb.SheetNames[0]];
  return sheetToJson(first);
}

export function escribirNormalizada(rows, overrides = {}) {
  const { destino } = resolvePaths(overrides);
  const wb = readWorkbook(destino, "Excel DESTINO (normalizada)");
  const name = wb.SheetNames[0];
  const out = rows.map((r) => {
    const o = {};
    for (const h of HEADERS_NORMAL) o[h] = r[h] ?? "";
    return o;
  });
  const sheet = jsonToSheet(out);
  // Forzar formato 0.00 a columnas monetarias
  applyMoneyFormatToSheet(
    sheet,
    HEADERS_NORMAL,
    ["costo","venta","precio venta","iva","ganancia"]
  );
  wb.Sheets[name] = sheet;
  writeWorkbookAtomic(wb, destino, "Excel DESTINO (normalizada)");
}

export function escribirNoEncontrados(rows, overrides = {}) {
  const { reporte } = resolvePaths(overrides);
  ensureDir(path.dirname(reporte));
  const out = rows.map((r) => ({
    PROVEEDOR: r["PROVEEDOR"] ?? "",
    CODIGO: r["CODIGO"] ?? "",
    "CODIGO FLEXXUS": r["CODIGO FLEXXUS"] ?? "",
    "DESCRIPCION FLEXXUS": r["DESCRIPCION FLEXXUS"] ?? r["Descripcion Flexxus"] ?? "",
    "PRECIO VENTA": toNumber(r["PRECIO VENTA"] ?? 0),
  }));
  const wb = { SheetNames: ["no_encontrados"], Sheets: {} };
  const sheet = jsonToSheet(out);
  // 0.00 para precio
  const headers = Object.keys(out[0] || {});
  applyMoneyFormatToSheet(sheet, headers, ["PRECIO VENTA"]);
  wb.Sheets["no_encontrados"] = sheet;
  writeWorkbookAtomic(wb, reporte, "Reporte no_encontrados.xlsx");
  return { path: reporte, count: out.length };
}

/**
 * 1) Importar precios:
 *   - K ("precio venta") = E ("PRECIO VENTA" del ORIGEN) por "codigo flexxus"
 * 2) Cálculos automáticos:
 *   - precio_por_unidad = K / L
 *   - C ("costo")       = precio_por_unidad * 1.21   (IVA 21%)
 *   - D ("venta")       = C * 1.40                    (ganancia 40%)
 * 3) Todos los montos se redondean a 2 decimales y se escriben como números.
 */
export function aplicarPrecios(overrides = {}) {
  const { origen, destino, reporte } = resolvePaths(overrides);

  assertFileReadable(origen, "Excel ORIGEN (Grais)");
  assertFileReadable(destino, "Excel DESTINO (normalizada)");

  const origenRows = leerOrigen({ origenPath: origen });
  const mapOrigen = new Map();
  for (const r of origenRows) {
    const codigo = String(r["CODIGO FLEXXUS"] ?? "").trim();
    if (!codigo) continue;
    const precio = toNumber(r["PRECIO VENTA"]);
    mapOrigen.set(codigo, precio);
  }

  // Reporte: filas del ORIGEN sin "CODIGO FLEXXUS" o vacío
  const noVinculadosOrigen = origenRows.filter((r) => !String(r["CODIGO FLEXXUS"] ?? "").trim());
  const rep = escribirNoEncontrados(noVinculadosOrigen, { reportePath: reporte });

  const normRows = leerNormalizada({ destinoPath: destino });
  let applied = 0, missingInOrigen = 0;

  const out = normRows.map((r) => {
    const codigo = String(r["codigo flexxus"] ?? "").trim();
    const caja = Math.max(1, toNumber(r["caja"] ?? 1)); // evita /0
    let k = toNumber(r["precio venta"]);                // K actual como número

    if (codigo && mapOrigen.has(codigo)) {
      k = toNumber(mapOrigen.get(codigo));              // K desde ORIGEN
      applied += 1;
    } else if (codigo) {
      missingInOrigen += 1;
    }

    const precioUnidad = k / caja;
    const costo = round2(precioUnidad * 1.21);          // C
    const venta = round2(costo * 1.40);                 // D
    const ivaMonto = round2(precioUnidad * 0.21);       // Monto de IVA
    const gananciaMonto = round2(costo * 0.40);         // Monto de ganancia

    return {
      ...r,
      "precio venta": round2(k),         // K (2 dec)
      "costo": costo,                    // C
      "venta": venta,                    // D
      "iva": ivaMonto,                   // M (monto, no %)
      "ganancia": gananciaMonto,         // N (monto)
    };
  });

  escribirNormalizada(out, { destinoPath: destino });

  return {
    ok: true,
    applied,
    totalDestino: normRows.length,
    missingInOrigen,
    no_encontrados: rep.count,
    no_encontrados_path: rep.path,
    origenPath: origen,
    destinoPath: destino,
  };
}

/**
 * Colocar imágenes:
 *  - Lee Q: "categoria"
 *  - Busca archivo en CFG.imgsDir que matchee (exacto/fuzzy)
 *  - Escribe ruta ABSOLUTA en O: "imagen"
 */
export function colocarImagenes(overrides = {}) {
  const { destino } = resolvePaths(overrides);
  const imgsDir = CFG.imgsDir;

  const norm = leerNormalizada({ destinoPath: destino });
  const out = norm.map((r) => {
    const categoria = String(r["categoria"] || "").trim();
    let abs = null;
    if (categoria) abs = findImagePathForCategory(categoria, imgsDir);
    const next = { ...r };
    if (abs) next["imagen"] = abs;
    return next;
  });

  escribirNormalizada(out, { destinoPath: destino });
  return { updated: out.length, destinoPath: destino, imgsDir };
}

export function exportarJson(overrides = {}) {
  const { json, destino } = resolvePaths(overrides);
  const rows = leerNormalizada({ destinoPath: destino });
  const out = rows.map((r) => ({
    codigo_flexxus: String(r["codigo flexxus"] ?? "").trim(),
    nombre_descripcion: String(r["nombre descripcion"] ?? "").trim(),
    costo: toNumber(r["costo"]),
    venta: toNumber(r["venta"]),
    mayorista: toNumber(r["mayorista"]),
    inventario: toNumber(r["inventario"]),
    inv_minimo: toNumber(r["inv_minimo"]),
    inv_maximo: toNumber(r["inv_máximo"]),
    proveedor: String(r["proveedor"] ?? "").trim(),
    descripcion_flexxus: String(r["descripcion flexxus"] ?? "").trim(),
    precio_venta: toNumber(r["precio venta"]),
    caja: String(r["caja"] ?? "").trim(),
    iva: toNumber(r["iva"]),
    ganancia: toNumber(r["ganancia"]),
    imagen: String(r["imagen"] ?? "").trim(),
    marca: String(r["marca"] ?? "").trim(),
    categoria: String(r["categoria"] ?? "").trim(),
    moneda: String(r["moneda"] ?? "").trim() || "ars",
  }));
  writeJsonAtomic(json, out);
  return { path: json, count: out.length };
}

export function preview(overrides = {}) {
  const origen = leerOrigen(overrides);
  const norm = leerNormalizada(overrides);
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

export function runAll(overrides = {}) {
  const p1 = aplicarPrecios(overrides);
  const p2 = colocarImagenes(overrides);
  const p3 = exportarJson(overrides);
  return { precios: p1, imagenes: p2, json: p3 };
}

/* fin */
