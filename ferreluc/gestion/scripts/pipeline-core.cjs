// (NUEVO) D:\empresas\ferreluc\gestion\scripts\pipeline-core.cjs
// Núcleo reutilizable para los scripts de ETL (grais)

const ExcelJS = require("exceljs");
const { RUTAS } = require("./config.cjs");
const {
  buildHeaderIndex,
  readCellText,
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

// exporta a json usando la ruta del config
function exportToJson(objs) {
  const fs = require("fs");
  const path = require("path");
  const outDir = RUTAS.OUTPUT_DIR;
  const outFile = RUTAS.OUTPUT_PATH;
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(objs, null, 2), "utf-8");
  return outFile;
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
  exportToJson,
  ensureImagenField,
};
