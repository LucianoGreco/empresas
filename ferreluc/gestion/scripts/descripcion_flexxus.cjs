// D:\empresas\ferreluc\gestion\scripts\descripcion_flexxus.cjs
// Copia "Descripcion Flexxus" desde ORIGEN → DESTINO por "CODIGO FLEXXUS"
// Requisitos: npm i exceljs

"use strict";

const ExcelJS = require("exceljs");
const { RUTAS } = require("./config.cjs");
const {
  buildHeaderIndex,
  readCellText,
  toKey,
  getWorksheetByNameOrFirst,
} = require("./common.cjs");
const { buildFlexxusKey } = require("./shared-keys.cjs");

const ORIGEN_XLSX = RUTAS.ORIGEN_XLSX;
const DESTINO_XLSX = RUTAS.DESTINO_XLSX;

function getIdxSafe(idx, candidates, fallback) {
  for (const c of candidates) {
    const k = typeof c === "string" ? toKey(c) : c;
    const v = idx.get(k);
    if (v) return v;
  }
  return fallback || null;
}

async function cargarOrigen(ruta) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ruta);
  const ws = getWorksheetByNameOrFirst(wb);
  if (!ws) throw new Error("[descripcion_flexxus] ORIGEN sin worksheet");
  const idx = buildHeaderIndex(ws);

  // columnas esperadas en ORIGEN (tolerantes)
  const colProv = getIdxSafe(idx, ["PROVEEDOR", "proveedor"]);
  const colCod = getIdxSafe(idx, ["CODIGO", "codigo"]);
  const colFlex = getIdxSafe(idx, ["CODIGO FLEXXUS", "codigo flexxus", "codigo_flexxus"]);
  const colDesc = getIdxSafe(idx, ["Descripcion Flexxus", "descripcion flexxus", "descripcion_flexxus"]);

  if (!colProv || !colCod || !colFlex || !colDesc) {
    throw new Error("[descripcion_flexxus] ORIGEN sin encabezados esperados (proveedor, codigo, codigo flexxus, descripcion).");
  }

  const map = new Map();

  ws.eachRow((row, r) => {
    if (r === 1) return;
    const proveedor = readCellText(row.getCell(colProv));
    const codigo = readCellText(row.getCell(colCod));
    const codigoFlexxus = readCellText(row.getCell(colFlex));
    const descripcion = readCellText(row.getCell(colDesc));
    const key = buildFlexxusKey({ codigoFlexxus, proveedor, codigo });
    if (!key) return;
    // última aparición gana
    map.set(key, descripcion || "");
  });

  return map;
}

async function escribirDestino(rutaDestino, origenMap) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(rutaDestino);
  const ws = getWorksheetByNameOrFirst(wb);
  if (!ws) throw new Error("[descripcion_flexxus] DESTINO sin worksheet");
  const idx = buildHeaderIndex(ws);

  const colFlexDst = getIdxSafe(idx, ["codigo flexxus", "codigo_flexxus"]);
  const colDescDst = getIdxSafe(idx, ["descripcion flexxus", "descripcion_flexxus"]);

  if (!colFlexDst || !colDescDst) {
    throw new Error("[descripcion_flexxus] DESTINO sin columnas requeridas (codigo_flexxus, descripcion_flexxus).");
  }

  let actualizados = 0;
  let sinMatch = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const key = readCellText(row.getCell(colFlexDst));
    if (!key) {
      sinMatch++;
      continue;
    }
    const desc = origenMap.get(key);
    if (!desc) {
      sinMatch++;
      continue;
    }
    // asignar solo si cambia para evitar “touch” innecesario
    if (readCellText(row.getCell(colDescDst)) !== desc) {
      row.getCell(colDescDst).value = desc;
      row.commit();
      actualizados++;
    }
  }

  await wb.xlsx.writeFile(rutaDestino);
  return { actualizados, sinMatch };
}

async function main() {
  console.time("descripcion_flexxus");
  try {
    const origenMap = await cargarOrigen(ORIGEN_XLSX);
    const { actualizados, sinMatch } = await escribirDestino(DESTINO_XLSX, origenMap);
    console.log(
      `[descripcion_flexxus] Actualizados: ${actualizados} | Sin coincidencia/desc vacía: ${sinMatch}`
    );
  } catch (err) {
    console.error("[descripcion_flexxus] ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    console.timeEnd("descripcion_flexxus");
  }
}

if (require.main === module) main();
module.exports = { main };
