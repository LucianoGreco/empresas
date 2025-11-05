// exportar_json.cjs
// Lee el XLSX destino (normalizado) → JSON + META (+ manifest)
// Requisitos: npm i chokidar exceljs

const fs = require("fs");
const chokidar = require("chokidar");
const crypto = require("crypto");
const { RUTAS, ROOT } = require("./config.cjs");
const {
  loadDestinoWorkbook,
  worksheetToObjects,
  ensureImagenField,
} = require("./pipeline-core.cjs");
const { writeManifest } = require("./pipeline-manifest.cjs");

const XLSX_PATH = RUTAS.DESTINO_XLSX;
const OUTPUT_DIR = RUTAS.OUTPUT_DIR;
const OUTPUT_PATH = RUTAS.OUTPUT_PATH;
const META_PATH = `${OUTPUT_DIR}/producto_grais.meta.json`;

function atomicWrite(path, data) {
  const tmp = `${path}.tmp.${Date.now()}`;
  fs.writeFileSync(tmp, data, "utf-8");
  fs.renameSync(tmp, path);
}

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

    // escribir JSON principal (atómico)
    await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
    const jsonString = JSON.stringify(rows, null, 2);
    atomicWrite(OUTPUT_PATH, jsonString);

    // armar META para el catálogo
    const meta = {
      source_excel: XLSX_PATH,
      generated_at: new Date().toISOString(),
      root: ROOT,
      total: rows.length,
      hash_md5: makeHash(jsonString),
      files: { data: OUTPUT_PATH },
      pipeline: {
        ran: ["importar_precios", "descripcion_flexxus", "colocar_imagenes", "exportar_json"],
      },
    };
    atomicWrite(META_PATH, JSON.stringify(meta, null, 2));

    // manifest global (para que el catálogo descubra datasets)
    await writeManifest();

    console.log(
      `[exportar_json] Exportado ${rows.length} registros → ${OUTPUT_PATH} (+ meta + manifest)`
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
    awaitWriteFinish: { stabilityThreshold: 700, pollInterval: 150 },
  });

  watcher
    .on("add", trigger)
    .on("change", trigger)
    .on("error", (e) => console.error("[exportar_json] Watcher error:", e.message));
}

if (require.main === module) {
  exportOnce().then(() => startWatcher());
}

module.exports = { exportOnce, startWatcher };
