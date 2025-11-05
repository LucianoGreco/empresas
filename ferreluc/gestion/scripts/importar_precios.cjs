// importar_precios.cjs
// Actualiza precios y recalcula IVA, costo, ganancia y venta.
// Genera reporte de origenes que NO están en el destino.
// Requisitos: npm i exceljs

const path = require("path");
const ExcelJS = require("exceljs");
const { RUTAS, CALC } = require("./config.cjs");
const {
  toKey,
  buildHeaderIndex,
  readCellText,
  parsePrecio,
  round2,
  ensureDir,
} = require("./common.cjs");
const { buildFlexxusKey } = require("./shared-keys.cjs");

const ORIGEN_XLSX = RUTAS.ORIGEN_XLSX;
const DESTINO_XLSX = RUTAS.DESTINO_XLSX;
const REPORTE_XLSX = RUTAS.REPORTE_XLSX;

function getIdxSafe(idx, names) {
  for (const n of names) {
    const k = typeof n === "string" ? toKey(n) : n;
    const v = idx.get(k);
    if (v) return v;
  }
  return null;
}

// Lee el Excel origen y devuelve un Map por codigoFlexxus
async function leerOrigen(ruta) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ruta);
  const ws = wb.worksheets[0];
  const idx = buildHeaderIndex(ws);

  const colProv = getIdxSafe(idx, ["PROVEEDOR", "proveedor"]);
  const colCod = getIdxSafe(idx, ["CODIGO", "codigo"]);
  const colFlex = getIdxSafe(idx, ["CODIGO FLEXXUS", "codigo flexxus"]);
  const colDesc = getIdxSafe(idx, ["Descripcion Flexxus", "descripcion flexxus"]);
  const colPrecio = getIdxSafe(idx, ["PRECIO VENTA", "precio venta"]);

  if (!colProv || !colCod || !colDesc || !colPrecio) {
    throw new Error("[importar_precios] ORIGEN sin encabezados esperados.");
  }

  const map = new Map();

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const proveedor = readCellText(row.getCell(colProv));
    const codigo = readCellText(row.getCell(colCod));
    const codigoFlexxus = readCellText(row.getCell(colFlex));
    const descFlexxus = readCellText(row.getCell(colDesc));
    const precioRaw = row.getCell(colPrecio).value;

    const key = buildFlexxusKey({ codigoFlexxus, proveedor, codigo });
    if (!key) return;

    const precio = parsePrecio(precioRaw);

    map.set(key, {
      proveedor,
      codigo,
      codigoFlexxus: key,
      descripcionFlexxus: descFlexxus,
      precioOrigen: precio,
    });
  });

  return map;
}

// Recorre el Excel destino y aplica los precios de origen
async function procesarDestino(rutaDestino, origenMap) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(rutaDestino);
  const ws = wb.worksheets[0];
  const idx = buildHeaderIndex(ws);

  const colFlex = getIdxSafe(idx, ["codigo flexxus", "codigo_flexxus"]);
  const colPrecioVenta = getIdxSafe(idx, ["precio venta", "precio_venta"]);
  const colCaja = getIdxSafe(idx, ["caja"]);
  const colIva = getIdxSafe(idx, ["iva"]);
  const colCosto = getIdxSafe(idx, ["costo"]);
  const colGan = getIdxSafe(idx, ["ganancia"]);
  const colVenta = getIdxSafe(idx, ["venta"]);

  const required = [colFlex, colPrecioVenta, colCaja, colIva, colCosto, colGan, colVenta];
  if (required.some((c) => !c)) {
    throw new Error(
      "[importar_precios] DESTINO sin encabezados mínimos (codigo flexxus, precio venta, caja, iva, costo, ganancia, venta)."
    );
  }

  const destCodes = new Set();
  let actualizados = 0;
  let sinPrecio = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const codigoFlex = readCellText(row.getCell(colFlex));
    if (!codigoFlex) continue;
    destCodes.add(codigoFlex);

    const src = origenMap.get(codigoFlex);
    if (!src) continue;

    const precioOrigen = src.precioOrigen;
    if (precioOrigen == null) {
      sinPrecio++;
      continue;
    }

    // caja
    let caja = parsePrecio(row.getCell(colCaja).value);
    if (!caja || caja <= 0) caja = 1;

    // K — PRECIO VENTA (del origen)
    const precioUnidad = precioOrigen / caja;
    row.getCell(colPrecioVenta).value = round2(precioOrigen);

    // M — IVA (monto)
    const iva = precioUnidad * CALC.IVA;
    row.getCell(colIva).value = round2(iva);

    // C — costo = precio unidad + IVA unidad
    const costo = precioUnidad + iva;
    row.getCell(colCosto).value = round2(costo);

    // N — ganancia (monto)
    const ganancia = costo * CALC.GANANCIA;
    row.getCell(colGan).value = round2(ganancia);

    // D — venta
    const venta = costo + ganancia;
    row.getCell(colVenta).value = round2(venta);

    row.commit();
    actualizados++;
  }

  await wb.xlsx.writeFile(rutaDestino);

  return { actualizados, sinPrecio, destCodes };
}

// Genera el Excel con los que estaban en origen pero NO en destino
async function escribirReporteNoEncontrados(rutaReporte, origenMap, destCodes) {
  ensureDir(path.dirname(rutaReporte));

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("no_encontrados");
  ws.addRow([
    "PROVEEDOR",
    "CODIGO",
    "CODIGO FLEXXUS",
    "Descripcion Flexxus",
    "PRECIO VENTA",
  ]);

  let count = 0;
  for (const src of origenMap.values()) {
    if (!destCodes.has(src.codigoFlexxus)) {
      ws.addRow([
        src.proveedor ?? "",
        src.codigo ?? "",
        src.codigoFlexxus ?? "",
        src.descripcionFlexxus ?? "",
        src.precioOrigen != null ? round2(src.precioOrigen) : "",
      ]);
      count++;
    }
  }

  await wb.xlsx.writeFile(rutaReporte);
  return count;
}

async function main() {
  console.time("importar_precios");
  try {
    const origenMap = await leerOrigen(ORIGEN_XLSX);
    const { actualizados, sinPrecio, destCodes } = await procesarDestino(
      DESTINO_XLSX,
      origenMap
    );
    const noEncontrados = await escribirReporteNoEncontrados(
      REPORTE_XLSX,
      origenMap,
      destCodes
    );

    console.log(
      `[importar_precios] Actualizados: ${actualizados} | Sin precio válido: ${sinPrecio} | No encontrados: ${noEncontrados}`
    );
  } catch (err) {
    console.error("[importar_precios] ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    console.timeEnd("importar_precios");
  }
}

if (require.main === module) main();
module.exports = { main };
