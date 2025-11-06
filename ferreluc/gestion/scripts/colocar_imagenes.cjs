// D:\empresas\ferreluc\gestion\scripts\colocar_imagenes.cjs
// Actualiza la columna "imagen" a partir de la columna "categoria"
// Requisitos: npm i exceljs
// Usa helpers compartidos de common.cjs para NO duplicar fuzzy ni normalización.

"use strict";

const ExcelJS = require("exceljs");
const { RUTAS, PARAMS } = require("./config.cjs");
const {
  buildHeaderIndex,
  readCellText,
  scanImages,
  bestFuzzyMatch,
  normalizeImagenPath,
  ensureDir,
} = require("./common.cjs");

const DESTINO_XLSX = RUTAS.DESTINO_XLSX;
const IMAGES_DIR = RUTAS.IMAGES_DIR;
const FALLBACK_IMG = RUTAS.FALLBACK_IMG;
const REPORTE_DIR = RUTAS.REPORTE_DIR; // p.ej .../listas/normalizadas/grais/reportes
const REPORTE_IMG_MATCHES = `${REPORTE_DIR}/imagenes_coincidencias.xlsx`;

async function main() {
  console.time("colocar_imagenes");
  const onlyEmpty = PARAMS.IMAGES_ONLY_EMPTY;
  const colNames = PARAMS.DEFAULT_COLUMNS;
  const fuzzyThreshold = PARAMS.IMAGE_FUZZY_THRESHOLD;

  try {
    // 0. Preparar salida de reportes
    ensureDir(REPORTE_DIR);

    // 1. Cargar workbook destino
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(DESTINO_XLSX);
    const ws = wb.worksheets?.[0];
    if (!ws) throw new Error("No se encontró la hoja destino (worksheets[0])");

    // 2. Index de headers
    const idx = buildHeaderIndex(ws);

    // Resolver columnas por nombre (case-insensitive) o fallar con error explícito
    const colImg =
      idx.get(String(colNames.IMAGEN || "imagen").toLowerCase()) ||
      idx.get("imagen");
    const colCat =
      idx.get(String(colNames.CATEGORIA || "categoria").toLowerCase()) ||
      idx.get("categoria");

    if (!colImg) {
      throw new Error(
        `No se encontró la columna de IMAGEN ('${colNames.IMAGEN}') en el header.`
      );
    }
    if (!colCat) {
      throw new Error(
        `No se encontró la columna de CATEGORIA ('${colNames.CATEGORIA}') en el header.`
      );
    }

    // 3. Indexar imágenes del FS UNA SOLA VEZ
    const { list: imageEntries } = scanImages(IMAGES_DIR);
    if (!imageEntries.length) {
      console.warn(
        `[colocar_imagenes] Advertencia: no se hallaron imágenes en '${IMAGES_DIR}'. Se usará solo fallback.`
      );
    }

    let actualizados = 0;
    let completados = 0;
    let sinCategoria = 0;
    let omitidosPorNoVacio = 0;
    let reemplazos = 0;
    let aFallback = 0;

    // Datos para reporte
    const reportRows = [];
    // Encabezados del reporte
    reportRows.push([
      "fila",
      "categoria",
      "accion", // asignada|fallback|omitida_por_onlyEmpty
      "imagen_final",
      "score",
      "motivo", // no_match | baja_confianza | reemplazo | existente_no_vacio
    ]);

    // 4. Recorrer filas
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const categoria = readCellText(row.getCell(colCat)).trim();
      const currentImg = readCellText(row.getCell(colImg)).trim();

      if (!categoria) {
        // no hay categoría, no sabemos qué buscar
        if (!onlyEmpty) {
          row.getCell(colImg).value = normalizeImagenPath(FALLBACK_IMG);
          row.commit();
          actualizados++;
          aFallback++;
          reportRows.push([
            r,
            "",
            "fallback",
            "/imagenes/sin_imagen.png",
            "",
            "sin_categoria",
          ]);
        } else {
          reportRows.push([
            r,
            "",
            "omitida_por_onlyEmpty",
            currentImg || "",
            "",
            "sin_categoria",
          ]);
        }
        sinCategoria++;
        continue;
      }

      // si el modo es "solo completar vacíos" y ya hay imagen, omitimos
      if (onlyEmpty && currentImg) {
        omitidosPorNoVacio++;
        reportRows.push([
          r,
          categoria,
          "omitida_por_onlyEmpty",
          currentImg,
          "",
          "existente_no_vacio",
        ]);
        continue;
      }

      // fuzzy sobre las imágenes locales
      const match = bestFuzzyMatch(categoria, imageEntries, fuzzyThreshold);
      const imgAbs = match?.path || null;
      const score = typeof match?.score === "number" ? match.score : null;

      // si no hubo match, fallback físico → y después lo pasamos a /imagenes/...
      const finalFsPath = imgAbs != null ? imgAbs : FALLBACK_IMG;

      // esto deja la ruta lista para el Next: /imagenes/loquesea.png
      const finalWebPath = normalizeImagenPath(finalFsPath);

      // ¿reemplazo vs completado?
      const habiaImagen = Boolean(currentImg);
      if (habiaImagen && finalWebPath !== currentImg) reemplazos++;

      row.getCell(colImg).value = finalWebPath;
      row.commit();
      actualizados++;
      if (!habiaImagen) completados++;
      if (finalFsPath === FALLBACK_IMG) aFallback++;

      // armar línea de reporte
      let accion = finalFsPath === FALLBACK_IMG ? "fallback" : "asignada";
      let motivo = !imgAbs
        ? "no_match"
        : score < fuzzyThreshold
        ? "baja_confianza"
        : habiaImagen
        ? "reemplazo"
        : "";

      reportRows.push([
        r,
        categoria,
        accion,
        finalWebPath,
        score != null ? score : "",
        motivo,
      ]);
    }

    // 5. Guardar destino
    await wb.xlsx.writeFile(DESTINO_XLSX);

    // 6. Generar reporte de coincidencias
    const repWb = new ExcelJS.Workbook();
    const repWs = repWb.addWorksheet("reporte");
    repWs.addRows(reportRows);
    // ancho columnas básico
    repWs.columns = [
      { header: "fila", width: 8 },
      { header: "categoria", width: 40 },
      { header: "accion", width: 22 },
      { header: "imagen_final", width: 50 },
      { header: "score", width: 10 },
      { header: "motivo", width: 20 },
    ];
    await repWb.xlsx.writeFile(REPORTE_IMG_MATCHES);

    console.log(
      `[colocar_imagenes] OK. Filas: ${ws.rowCount - 1}. ` +
        `Actualizadas: ${actualizados}. Completadas (vacías): ${completados}. ` +
        `Reemplazos: ${reemplazos}. Fallback: ${aFallback}. ` +
        `Sin categoría: ${sinCategoria}. Omitidas (solo vacíos): ${omitidosPorNoVacio}. ` +
        `Umbral fuzzy: ${fuzzyThreshold}. ` +
        `Reporte: ${REPORTE_IMG_MATCHES}`
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
