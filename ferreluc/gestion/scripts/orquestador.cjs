// orquestador.cjs
// D:\empresas\ferreluc\gestion\scripts\orquestador.cjs
// Orquesta el pipeline completo:
//
// 1) si cambia ORIGEN → importar_precios → descripcion_flexxus
// 2) si cambia DESTINO (externo) → descripcion_flexxus
// 3) si cambian IMÁGENES → colocar_imagenes
// 4) siempre al final → exportar_json
//
// Además: evita el loop de auto-disparo ignorando los cambios en DESTINO
// que fueron provocados por ESTE MISMO proceso en los últimos N ms.

const chokidar = require("chokidar");
const { RUTAS } = require("./config.cjs");
const { main: runImportarPrecios } = require("./importar_precios.cjs");
const { main: runDescripcionFlexxus } = require("./descripcion_flexxus.cjs");
const { main: runColocarImagenes } = require("./colocar_imagenes.cjs");
const { exportOnce } = require("./exportar_json.cjs");

const ORIGEN_XLSX = RUTAS.ORIGEN_XLSX;
const DESTINO_XLSX = RUTAS.DESTINO_XLSX;
const IMAGES_DIR = RUTAS.IMAGES_DIR;

// ventana de tiempo para considerar "esto lo escribí yo"
const SELF_WRITE_WINDOW_MS = 2000;

let timer = null;
let running = false;
let pending = false;

// flags para saber qué cambió
let origenChanged = false;
let destinoChanged = false;
let imagesChanged = false;

// timestamps de última escritura hecha por el pipeline
let lastDestinoWriteTs = 0;

function markDestinoWritten() {
  lastDestinoWriteTs = Date.now();
}

function isSelfWrite(ts) {
  return Date.now() - ts < SELF_WRITE_WINDOW_MS;
}

function schedulePipeline() {
  clearTimeout(timer);
  timer = setTimeout(pipeline, 500);
}

async function pipeline() {
  if (running) {
    pending = true;
    return;
  }
  running = true;

  try {
    // si cambió origen: hay que recalcular todo lo numérico
    if (origenChanged) {
      console.log("[orquestador] ▶ importar_precios (por cambio en ORIGEN)...");
      await runImportarPrecios();
      console.log("[orquestador] ✔ importar_precios OK");

      // importar_precios escribe DESTINO
      markDestinoWritten();

      console.log("[orquestador] ▶ descripcion_flexxus (reaplicar)...");
      await runDescripcionFlexxus();
      console.log("[orquestador] ✔ descripcion_flexxus OK");

      // descripcion_flexxus también escribe DESTINO
      markDestinoWritten();
    } else if (destinoChanged) {
      console.log("[orquestador] ▶ descripcion_flexxus (por cambio en DESTINO)...");
      await runDescripcionFlexxus();
      console.log("[orquestador] ✔ descripcion_flexxus OK");

      markDestinoWritten();
    }

    // si cambiaron imágenes o cualquier cosa anterior, recolocamos
    if (imagesChanged || origenChanged || destinoChanged) {
      console.log("[orquestador] ▶ colocar_imagenes...");
      await runColocarImágenesSeguro();
      console.log("[orquestador] ✔ colocar_imagenes OK");
    }

    // siempre que llegamos acá exportamos
    console.log("[orquestador] ▶ exportar_json...");
    await exportOnce();
    console.log("[orquestador] ✔ exportar_json OK");
  } catch (e) {
    console.error("[orquestador] ERROR:", e?.message || e);
  } finally {
    running = false;
    // reseteo flags
    origenChanged = false;
    destinoChanged = false;
    imagesChanged = false;

    if (pending) {
      pending = false;
      schedulePipeline();
    }
  }
}

// pequeño wrapper para poder marcar que tocamos el destino
async function runColocarImágenesSeguro() {
  await runColocarImagenes();
  // este script también pisa DESTINO
  markDestinoWritten();
}

console.log("[orquestador] Observando:");
console.log(" - ORIGEN:", ORIGEN_XLSX);
console.log(" - DESTINO:", DESTINO_XLSX);
console.log(" - Imágenes:", IMAGES_DIR);

// watcher de ORIGEN
chokidar
  .watch([ORIGEN_XLSX], {
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 600, pollInterval: 150 },
  })
  .on("add", () => {
    origenChanged = true;
    schedulePipeline();
  })
  .on("change", () => {
    origenChanged = true;
    schedulePipeline();
  })
  .on("error", (e) => console.error("[orquestador] watcher origen:", e.message));

// watcher de DESTINO
chokidar
  .watch([DESTINO_XLSX], {
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 600, pollInterval: 150 },
  })
  .on("add", () => {
    // si lo acabamos de escribir nosotros, ignorar
    if (isSelfWrite(lastDestinoWriteTs)) return;
    destinoChanged = true;
    schedulePipeline();
  })
  .on("change", () => {
    if (isSelfWrite(lastDestinoWriteTs)) return;
    destinoChanged = true;
    schedulePipeline();
  })
  .on("error", (e) => console.error("[orquestador] watcher destino:", e.message));

// watcher de IMÁGENES
chokidar
  .watch([IMAGES_DIR], {
    ignoreInitial: true,
    depth: 1,
    awaitWriteFinish: { stabilityThreshold: 600, pollInterval: 150 },
  })
  .on("all", () => {
    imagesChanged = true;
    schedulePipeline();
  })
  .on("error", (e) => console.error("[orquestador] watcher img:", e.message));

// correr una vez al inicio
schedulePipeline();
