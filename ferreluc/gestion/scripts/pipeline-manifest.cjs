// pipeline-manifest.cjs
// (NUEVO) mini utilidad para generar un manifest de lo que hay en /json
// Lo puede leer el catálogo para saber qué colecciones tiene.

const fs = require("fs");
const { RUTAS } = require("./config.cjs");

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
  await fs.promises.writeFile(
    manifestPath,
    JSON.stringify(manifest, null, 2),
    "utf-8"
  );

  return manifestPath;
}

if (require.main === module) {
  writeManifest().then((p) => console.log("[pipeline-manifest] escrito:", p));
}

module.exports = { writeManifest };
