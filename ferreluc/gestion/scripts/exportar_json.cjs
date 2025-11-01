// D:\empresas\ferreluc\gestion\scripts\exportar_json.cjs
// Lee el XLSX destino y lo vuelca a un JSON ordenado que usa el catálogo.
// Requisitos: npm i xlsx chokidar

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const chokidar = require("chokidar");
const { RUTAS } = require("./config.cjs");
const {
  normalizeHeader,
  HEADER_MAP,
  toSnakeCase,
  castValue,
  sortKeys,
  normalizeImagenPath,
} = require("./common.cjs");

const XLSX_PATH = RUTAS.DESTINO_XLSX;
const OUTPUT_DIR = RUTAS.OUTPUT_DIR;
const OUTPUT_PATH = RUTAS.OUTPUT_PATH;

async function exportOnce() {
  try {
    if (!fs.existsSync(XLSX_PATH)) {
      console.error(`[exportar_json] No se encontró el Excel: ${XLSX_PATH}`);
      return;
    }

    const wb = XLSX.readFile(XLSX_PATH, { cellDates: false });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) {
      console.error("[exportar_json] El archivo no tiene hojas.");
      return;
    }

    const sheet = wb.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: null,
      raw: false,
    });

    const out = rows.map((row) => {
      const outRow = {};
      for (const [rawHeader, rawValue] of Object.entries(row)) {
        const norm = normalizeHeader(rawHeader);
        const destKey = HEADER_MAP[norm] || toSnakeCase(norm);
        outRow[destKey] = castValue(rawValue);
      }

      // asegurar imagen normalizada para el Next
      outRow.imagen = normalizeImagenPath(outRow.imagen);

      return sortKeys(outRow);
    });

    await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.promises.writeFile(
      OUTPUT_PATH,
      JSON.stringify(out, null, 2),
      "utf8"
    );

    console.log(
      `[exportar_json] Exportado ${out.length} registros → ${OUTPUT_PATH}`
    );
  } catch (err) {
    console.error("[exportar_json] Error exportando:", err.message);
  }
}

function startWatcher() {
  console.log(`[exportar_json] Observando cambios en: ${XLSX_PATH}`);

  let timer = null;
  const trigger = () => {
    clearTimeout(timer);
    timer = setTimeout(() => exportOnce(), 600);
  };

  const watcher = chokidar.watch(XLSX_PATH, {
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  watcher
    .on("add", trigger)
    .on("change", trigger)
    .on("error", (e) =>
      console.error("[exportar_json] Watcher error:", e.message)
    );
}

if (require.main === module) {
  exportOnce().then(() => startWatcher());
}

module.exports = { exportOnce, startWatcher };
