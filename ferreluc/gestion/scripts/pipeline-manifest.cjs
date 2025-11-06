// D:\empresas\ferreluc\gestion\scripts\pipeline-manifest.cjs
// Mini utilidad para generar un manifest de lo que hay en /json

"use strict";

const fs = require("fs");
const { RUTAS } = require("./config.cjs");

function atomicWrite(path, data) {
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, data, "utf-8");
  fs.renameSync(tmp, path);
}

async function writeManifest() {
  const outDir = RUTAS.OUTPUT_DIR;
  const manifestPath = `${outDir}/manifest.json`;

  const manifest = {
    updated_at: new Date().toISOString(),
    datasets: [
      {
        id: "producto_grais",
        path: RUTAS.OUTPUT_PATH,
        description: "Listado normalizado de proveedor Grais",
        kind: "products",
      },
    ],
  };

  await fs.promises.mkdir(outDir, { recursive: true });
  atomicWrite(manifestPath, JSON.stringify(manifest, null, 2));

  return manifestPath;
}

if (require.main === module) {
  writeManifest().then((p) => console.log("[pipeline-manifest] escrito:", p));
}

module.exports = { writeManifest };
