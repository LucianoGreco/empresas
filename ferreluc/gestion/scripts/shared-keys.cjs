// D:\empresas\ferreluc\gestion\scripts\shared-keys.cjs
// Construcción consistente de la key "codigo flexxus"
// Preferencia: explícito > proveedor+codigo > null

"use strict";

/**
 * Normaliza un segmento de clave:
 * - trim
 * - colapsa espacios a uno
 * - mayúsculas (case-insensitive consistente)
 */
function normalizeKeyPart(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

/**
 * Construye la clave canónica usada en ORIGEN y DESTINO.
 * Si viene codigoFlexxus explícito, se usa tal cual (trim + normalizado mínimo).
 * Si no, se arma PROVEEDOR-CODIGO (ambos normalizados).
 */
function buildFlexxusKey({ codigoFlexxus, proveedor, codigo }) {
  const flex = normalizeKeyPart(codigoFlexxus);
  if (flex) return flex;

  const prov = normalizeKeyPart(proveedor);
  const cod = normalizeKeyPart(codigo);

  if (prov && cod) return `${prov}-${cod}`;

  return null;
}

module.exports = {
  buildFlexxusKey,
  normalizeKeyPart,
};
