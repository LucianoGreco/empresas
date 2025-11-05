// descripcion_flexxus.cjs
// Copia "Descripcion Flexxus" desde ORIGEN → DESTINO por "CODIGO FLEXXUS"
// Requisitos: npm i exceljs

const ExcelJS = require("exceljs");
const { RUTAS } = require("./config.cjs");
const { buildHeaderIndex, readCellText, toKey } = require("./common.cjs");
const { buildFlexxusKey } = require("./shared-keys.cjs");

const ORIGEN_XLSX = RUTAS.ORIGEN_XLSX;
const DESTINO_XLSX = RUTAS.DESTINO_XLSX;

function getIdxSafe(idx, candidates, fallback) {
  for (const c of candidates) {
    const k = typeof c === "string" ? toKey(c) : c;
    const v = idx.get(k);
    if (v) return v;
  }
  return fallback;
}

async function cargarOrigen(ruta) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ruta);
  const ws = wb.worksheets[0];
  const idx = buildHeaderIndex(ws);

  // columnas esperadas en ORIGEN (tolerantes)
  const colProv = getIdxSafe(idx, ["PROVEEDOR", "proveedor"], 1);
  const colCod = getIdxSafe(idx, ["CODIGO", "codigo"], 2);
  const colFlex = getIdxSafe(idx, ["CODIGO FLEXXUS", "codigo flexxus", "codigo_flexxus"], 3);
  const colDesc = getIdxSafe(idx, ["Descripcion Flexxus", "descripcion flexxus", "descripcion_flexxus"], 4);

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
  const ws = wb.worksheets[0];
  const idx = buildHeaderIndex(ws);

  const colFlexDst = getIdxSafe(idx, ["codigo flexxus", "codigo_flexxus"], 1);
  const colDescDst = getIdxSafe(idx, ["descripcion flexxus", "descripcion_flexxus"], 10);

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
    if (desc == null || desc === "") {
      sinMatch++;
      continue;
    }

    row.getCell(colDescDst).value = desc;
    row.commit();
    actualizados++;
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
