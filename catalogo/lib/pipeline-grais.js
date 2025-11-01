// D:\empresas\catalogo\lib\pipeline-grais.js
// Ahora este archivo solo organiza y reexpone la pipeline.
// Toda la lógica vive en etl-grais-shared.js

export {
  leerOrigen,
  leerNormalizada,
  escribirNormalizada,
  escribirNoEncontrados,
  aplicarPrecios,
  colocarImagenes,
  exportarJson,
  preview,
  runAll,
} from "./etl-grais-shared.js";
