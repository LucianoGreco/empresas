// D:\empresas\ferreluc\gestion\scripts\colocar_imagenes.cjs
// Actualiza la columna "imagen" a partir de la columna "categoria"
// Requisitos: npm i exceljs
// Usa helpers compartidos de common.cjs para NO duplicar fuzzy ni normalización.

const ExcelJS = require("exceljs");
const { RUTAS, PARAMS } = require("./config.cjs");
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
  const onlyEmpty = PARAMS.IMAGES_ONLY_EMPTY;
  const colNames = PARAMS.DEFAULT_COLUMNS;
  const fuzzyThreshold = PARAMS.IMAGE_FUZZY_THRESHOLD;

  try {
    // 1. Cargar workbook destino
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(DESTINO_XLSX);
    const ws = wb.worksheets[0];

    // 2. Index de headers
    const idx = buildHeaderIndex(ws);

    // nombre normalizado de header → índice de columna
    const colImg =
      idx.get(colNames.IMAGEN.toLowerCase()) ||
      idx.get("imagen") ||
      15; // O por compatibilidad
    const colCat =
      idx.get(colNames.CATEGORIA.toLowerCase()) ||
      idx.get("categoria") ||
      17; // Q por compatibilidad

    // 3. Indexar imágenes del FS UNA SOLA VEZ
    const { list: imageEntries } = scanImages(IMAGES_DIR);

    let actualizados = 0;
    let completados = 0;
    let sinCategoria = 0;

    // 4. Recorrer filas
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const categoria = readCellText(row.getCell(colCat)).trim();
      const currentImg = readCellText(row.getCell(colImg)).trim();

      if (!categoria) {
        // no hay categoría, no sabemos qué buscar
        if (!onlyEmpty) {
          // igual ponemos fallback
          row.getCell(colImg).value = normalizeImagenPath(FALLBACK_IMG);
          row.commit();
          actualizados++;
        }
        sinCategoria++;
        continue;
      }

      // si el modo es "solo completar vacíos" y ya hay imagen, seguimos
      if (onlyEmpty && currentImg) {
        continue;
      }

      // fuzzy sobre las imágenes reales que hay en el disco
      let imgAbs = bestFuzzyMatch(categoria, imageEntries, fuzzyThreshold);

      // si no hubo match, fallback físico → y después lo pasamos a /imagenes/...
      const finalPath = imgAbs != null ? imgAbs : FALLBACK_IMG;

      // esto deja la ruta lista para el Next: /imagenes/loquesea.png
      row.getCell(colImg).value = normalizeImagenPath(finalPath);
      row.commit();
      actualizados++;
      if (!currentImg) completados++;
    }

    // 5. Guardar
    await wb.xlsx.writeFile(DESTINO_XLSX);
    console.log(
      `[colocar_imagenes] OK. Filas: ${ws.rowCount - 1}. Actualizadas: ${actualizados}. Completadas (vacías): ${completados}. Sin categoría: ${sinCategoria}. Modo solo vacíos: ${onlyEmpty}`
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
