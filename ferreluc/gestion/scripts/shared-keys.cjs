// shared-keys.cjs
// Construcción consistente de la key "codigo flexxus"
// Preferencia: explicito > proveedor+codigo > null

function buildFlexxusKey({ codigoFlexxus, proveedor, codigo }) {
  const flex = (codigoFlexxus || "").trim();
  if (flex) return flex;

  const prov = (proveedor || "").trim();
  const cod = (codigo || "").trim();

  if (prov && cod) return `${prov}-${cod}`;

  return null;
}

module.exports = {
  buildFlexxusKey,
};
