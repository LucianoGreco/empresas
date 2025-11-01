// orquestador.cjs — observa Excel/Imágenes y corre: colocar_imagenes -> exportar_json
const chokidar = require("chokidar");
const { RUTAS } = require("./config.cjs");
const { main: runColocarImagenes } = require("./colocar_imagenes.cjs");
const { exportOnce } = require("./exportar_json.cjs");

const XLSX_PATH  = RUTAS.DESTINO_XLSX;
const IMAGES_DIR = RUTAS.IMAGES_DIR;

let timer = null;
let running = false;
let pending = false;

function trigger() { clearTimeout(timer); timer = setTimeout(pipeline, 500); }

async function pipeline() {
  if (running) { pending = true; return; }
  running = true;
  try {
    console.log("[orquestador] ▶ colocar_imagenes...");
    await runColocarImagenes();
    console.log("[orquestador] ✔ colocar_imagenes OK");

    console.log("[orquestador] ▶ exportar_json...");
    await exportOnce();
    console.log("[orquestador] ✔ exportar_json OK");
  } catch (e) {
    console.error("[orquestador] ERROR:", e?.message || e);
  } finally {
    running = false;
    if (pending) { pending = false; trigger(); }
  }
}

console.log("[orquestador] Observando:");
console.log(" - Excel:", XLSX_PATH);
console.log(" - Imágenes:", IMAGES_DIR);

chokidar
  .watch([XLSX_PATH], {
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 600, pollInterval: 150 },
  })
  .on("add", trigger)
  .on("change", trigger)
  .on("error", (e) => console.error("[orquestador] watcher xlsx:", e.message));

chokidar
  .watch([IMAGES_DIR], {
    ignoreInitial: true,
    depth: 1,
    awaitWriteFinish: { stabilityThreshold: 600, pollInterval: 150 },
  })
  .on("add", trigger)
  .on("change", trigger)
  .on("unlink", trigger)
  .on("addDir", trigger)
  .on("unlinkDir", trigger)
  .on("error", (e) => console.error("[orquestador] watcher img:", e.message));

pipeline();
