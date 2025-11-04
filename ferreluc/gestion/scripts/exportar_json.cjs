// exportar_json.cjs
// D:\empresas\ferreluc\gestion\scripts\exportar_json.cjs
// Lee el XLSX destino (ya normalizado) y lo vuelca a un JSON ordenado que usa el catálogo.
// Además genera un META con info útil para el Next.
// Requisitos: npm i chokidar exceljs

const fs = require("fs");
const chokidar = require("chokidar");
const crypto = require("crypto");
const { RUTAS, ROOT } = require("./config.cjs");
const {
  loadDestinoWorkbook,
  worksheetToObjects,
  exportToJson,
  ensureImagenField,
} = require("./pipeline-core.cjs");

const XLSX_PATH = RUTAS.DESTINO_XLSX;
const OUTPUT_DIR = RUTAS.OUTPUT_DIR;
const OUTPUT_PATH = RUTAS.OUTPUT_PATH;
const META_PATH = `${OUTPUT_DIR}/producto_grais.meta.json`;

function makeHash(data) {
  return crypto.createHash("md5").update(data).digest("hex");
}

async function exportOnce() {
  try {
    if (!fs.existsSync(XLSX_PATH)) {
      console.error(`[exportar_json] No se encontró el Excel: ${XLSX_PATH}`);
      return;
    }

    const { ws } = await loadDestinoWorkbook();
    let rows = worksheetToObjects(ws);

    // asegurar imagen normalizada para el Next
    rows = rows.map((r) => ensureImagenField(r));

    // escribir JSON principal
    await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
    const jsonString = JSON.stringify(rows, null, 2);
    await fs.promises.writeFile(OUTPUT_PATH, jsonString, "utf-8");

    // armar META para el catálogo
    const meta = {
      source_excel: XLSX_PATH,
      generated_at: new Date().toISOString(),
      root: ROOT,
      total: rows.length,
      hash_md5: makeHash(jsonString),
      files: {
        data: OUTPUT_PATH,
      },
      pipeline: {
        // el catálogo puede mostrar esto
        ran: ["importar_precios", "descripcion_flexxus", "colocar_imagenes", "exportar_json"],
      },
    };

    await fs.promises.writeFile(
      META_PATH,
      JSON.stringify(meta, null, 2),
      "utf-8"
    );

    console.log(
      `[exportar_json] Exportado ${rows.length} registros → ${OUTPUT_PATH} (+ meta)`
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
