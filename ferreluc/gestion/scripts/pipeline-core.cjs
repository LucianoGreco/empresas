// pipeline-core.cjs
// Núcleo reutilizable para los scripts de ETL (grais)

const ExcelJS = require("exceljs");
const { RUTAS } = require("./config.cjs");
const {
  buildHeaderIndex,
  mapHeadersFromRow,
  normalizeImagenPath,
} = require("./common.cjs");

// carga el excel destino ya normalizado
async function loadDestinoWorkbook() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(RUTAS.DESTINO_XLSX);
  const ws = wb.worksheets[0];
  return { wb, ws };
}

// lee todas las filas a objetos canónicos
function worksheetToObjects(ws) {
  const idx = buildHeaderIndex(ws);
  const rows = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const obj = mapHeadersFromRow(row, idx);
    rows.push(obj);
  }
  return rows;
}

// normaliza campo imagen en un objeto
function ensureImagenField(o) {
  if (!o) return o;
  o.imagen = normalizeImagenPath(o.imagen);
  return o;
}

module.exports = {
  loadDestinoWorkbook,
  worksheetToObjects,
  ensureImagenField,
};
