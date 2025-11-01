// D:\empresas\ferreluc\gestion\scripts\colocar_imagenes.cjs
// PISA SIEMPRE la columna "imagen" a partir de la columna "categoria"
// Requisitos: npm i exceljs
// Usa helpers compartidos de common.cjs para NO duplicar fuzzy ni normalización.

const ExcelJS = require("exceljs");
const { RUTAS } = require("./config.cjs");
const {
  buildHeaderIndex,
  readCellText,
  scanImages,
  bestFuzzyMatch,
  normalizeImagenPath,
} = require("./common.cjs");

const DESTINO_XLSX = RUTAS.DESTINO_XLSX;
const IMAGES_DIR = RUTAS.IMAGES_DIR;
const FALLBACK_IMG = RUTAS.FALLBACK_IMG;

async function main() {
  console.time("colocar_imagenes");

  try {
    // 1. Cargar workbook destino
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(DESTINO_XLSX);
    const ws = wb.worksheets[0];

    // 2. Index de headers
    const idx = buildHeaderIndex(ws);
    const colImg = idx.get("imagen") || 15; // O
    const colCat = idx.get("categoria") || 17; // Q

    // 3. Indexar imágenes del FS UNA SOLA VEZ
    const { list: imageEntries } = scanImages(IMAGES_DIR);

    let actualizados = 0;

    // 4. Recorrer filas
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const categoria = readCellText(row.getCell(colCat)).trim();

      let imgAbs = null;

      if (categoria) {
        // fuzzy sobre las imágenes reales que hay en el disco
        imgAbs = bestFuzzyMatch(categoria, imageEntries, 0.55);
      }

      // si no hubo match, fallback físico → y después lo pasamos a /imagenes/...
      const finalPath =
        imgAbs != null ? imgAbs : FALLBACK_IMG;

      // esto deja la ruta lista para el Next: /imagenes/loquesea.png
      row.getCell(colImg).value = normalizeImagenPath(finalPath);
      row.commit();
      actualizados++;
    }

    // 5. Guardar
    await wb.xlsx.writeFile(DESTINO_XLSX);
    console.log(
      `[colocar_imagenes] Columna "imagen" actualizada. Filas procesadas: ${actualizados}`
    );
  } catch (err) {
    console.error("[colocar_imagenes] ERROR:", err.message);
    process.exitCode = 1;
  } finally {
    console.timeEnd("colocar_imagenes");
  }
}

if (require.main === module) main();
module.exports = { main };
