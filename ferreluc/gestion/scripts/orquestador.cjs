// D:\empresas\ferreluc\gestion\scripts\orquestador.cjs
// Orquesta el pipeline completo:
// 1) si cambia ORIGEN → importar_precios → descripcion_flexxus
// 2) si cambia DESTINO (externo) → descripcion_flexxus
// 3) si cambian IMÁGENES → colocar_imagenes
// 4) siempre al final → exportar_json
//
// Evita loops ignorando cambios en DESTINO escritos por este proceso.

"use strict";

const chokidar = require("chokidar");
const { RUTAS } = require("./config.cjs");
const { main: runImportarPrecios } = require("./importar_precios.cjs");
const { main: runDescripcionFlexxus } = require("./descripcion_flexxus.cjs");
const { main: runColocarImagenes } = require("./colocar_imagenes.cjs");
const { exportOnce } = require("./exportar_json.cjs");

const ORIGEN_XLSX = RUTAS.ORIGEN_XLSX;
const DESTINO_XLSX = RUTAS.DESTINO_XLSX;
const IMAGES_DIR = RUTAS.IMAGES_DIR;

const SELF_WRITE_WINDOW_MS = 2000;

let timer = null;
let running = false;
let pending = false;

// flags de cambio
let origenChanged = false;
let destinoChanged = false;
let imagesChanged = false;

// timestamp de última escritura hecha por el pipeline
let lastDestinoWriteTs = 0;

function markDestinoWritten() {
  lastDestinoWriteTs = Date.now();
}

function isSelfWrite() {
  // si ocurrió un cambio dentro de la ventana luego de que escribimos, lo ignoramos
  return Date.now() - lastDestinoWriteTs < SELF_WRITE_WINDOW_MS;
}

function schedulePipeline() {
  clearTimeout(timer);
  timer = setTimeout(pipeline, 500);
}

async function runColocarImagenesSeguro() {
  await runColocarImagenes();
  markDestinoWritten(); // también escribe DESTINO
}

async function pipeline() {
  if (running) {
    pending = true;
    return;
  }
  running = true;

  try {
    if (origenChanged) {
      console.log("[orquestador] ▶ importar_precios (por cambio en ORIGEN)...");
      await runImportarPrecios();
      console.log("[orquestador] ✔ importar_precios OK");
      markDestinoWritten();

      console.log("[orquestador] ▶ descripcion_flexxus (reaplicar)...");
      await runDescripcionFlexxus();
      console.log("[orquestador] ✔ descripcion_flexxus OK");
      markDestinoWritten();
    } else if (destinoChanged) {
      console.log("[orquestador] ▶ descripcion_flexxus (por cambio en DESTINO)...");
      await runDescripcionFlexxus();
      console.log("[orquestador] ✔ descripcion_flexxus OK");
      markDestinoWritten();
    }

    if (imagesChanged || origenChanged || destinoChanged) {
      console.log("[orquestador] ▶ colocar_imagenes...");
      await runColocarImagenesSeguro();
      console.log("[orquestador] ✔ colocar_imagenes OK");
    }

    console.log("[orquestador] ▶ exportar_json...");
    await exportOnce();
    console.log("[orquestador] ✔ exportar_json OK");
  } catch (e) {
    console.error("[orquestador] ERROR:", e?.message || e);
  } finally {
    running = false;
    origenChanged = false;
    destinoChanged = false;
    imagesChanged = false;

    if (pending) {
      pending = false;
      schedulePipeline();
    }
  }
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
  .on("add", () => { origenChanged = true; schedulePipeline(); })
  .on("change", () => { origenChanged = true; schedulePipeline(); })
  .on("error", (e) => console.error("[orquestador] watcher origen:", e.message));

// watcher de DESTINO
chokidar
  .watch([DESTINO_XLSX], {
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 600, pollInterval: 150 },
  })
  .on("add", () => {
    if (isSelfWrite()) return;
    destinoChanged = true; schedulePipeline();
  })
  .on("change", () => {
    if (isSelfWrite()) return;
    destinoChanged = true; schedulePipeline();
  })
  .on("error", (e) => console.error("[orquestador] watcher destino:", e.message));

// watcher de IMÁGENES
chokidar
  .watch([IMAGES_DIR], {
    ignoreInitial: true,
    depth: 1,
    awaitWriteFinish: { stabilityThreshold: 600, pollInterval: 150 },
  })
  .on("all", () => { imagesChanged = true; schedulePipeline(); })
  .on("error", (e) => console.error("[orquestador] watcher img:", e.message));

// correr una vez al inicio
schedulePipeline();
