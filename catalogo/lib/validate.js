// D:\empresas\catalogo\lib\validate.js (SIN zod)

/* ===== Parser numérico robusto (coma/punto, símbolos) =====
   Admite "$ 12.640,69", "12,640.69", "12640,69", "1 234,56", etc. */
export function toNumberSafe(v) {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  let s = String(v).trim();
  if (!s) return undefined;

  // quitar todo lo que no sea dígito, separadores o signo
  s = s.replace(/[^\d.,\-]/g, "");

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // es-AR: "12.640,69"  -> "." miles, "," decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(/,/g, ".");
    } else {
      // en-US: "12,640.69" -> quitar comas de miles
      s = s.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    // Solo coma => decimal
    s = s.replace(/\./g, "").replace(/,/g, ".");
  } else {
    // Solo punto o ninguno => quitar comas de miles si quedaron
    s = s.replace(/,(?=\d{3}\b)/g, "");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function toStringSafe(v) {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

// ---- validación mínima: tipos y no-negativos donde aplica ----
const rules = {
  // strings opcionales
  sku: { type: "string", min: 1, optional: true },
  codigo_flexxus: { type: "string", min: 1, optional: true },
  categoria: { type: "string", min: 1, optional: true },
  marca: { type: "string", min: 1, optional: true },
  moneda: { type: "string", min: 1, optional: true },
  proveedor: { type: "string", min: 1, optional: true },
  descripcion_flexxus: { type: "string", min: 1, optional: true },
  imagen: { type: "string", min: 1, optional: true },

  // nombre_descripcion es requerido
  nombre_descripcion: { type: "string", min: 1, optional: false },

  // números >= 0 (opcionales)
  costo: { type: "number", min: 0, optional: true },
  venta: { type: "number", min: 0, optional: true },
  precio_venta: { type: "number", min: 0, optional: true },
  mayorista: { type: "number", min: 0, optional: true },
  inventario: { type: "number", min: 0, optional: true },
  inv_minimo: { type: "number", min: 0, optional: true },
  inv_maximo: { type: "number", min: 0, optional: true },

  // permisivos (pueden ser número o string)
  caja: { type: "mixed", optional: true },
  iva: { type: "mixed", optional: true },

  // ganancia puede ser negativa (liquidación)
  ganancia: { type: "number", optional: true },
};

// Coerción previa (convierte tipos suaves)
function coerceProduct(raw) {
  const r = { ...raw };

  r.nombre_descripcion = toStringSafe(r.nombre_descripcion);
  r.sku = toStringSafe(r.sku);
  r.codigo_flexxus = toStringSafe(r.codigo_flexxus);
  r.categoria = toStringSafe(r.categoria);
  r.marca = toStringSafe(r.marca);
  r.moneda = toStringSafe(r.moneda);
  r.proveedor = toStringSafe(r.proveedor);
  r.descripcion_flexxus = toStringSafe(r.descripcion_flexxus);
  r.imagen = toStringSafe(r.imagen);

  r.costo = toNumberSafe(r.costo);
  r.venta = toNumberSafe(r.venta);
  r.precio_venta = toNumberSafe(r.precio_venta);
  r.mayorista = toNumberSafe(r.mayorista);
  r.inventario = toNumberSafe(r.inventario);
  r.inv_minimo = toNumberSafe(r.inv_minimo);
  r.inv_maximo = toNumberSafe(r.inv_maximo);
  // mixed: caja, iva -> dejamos tal cual
  r.ganancia = toNumberSafe(r.ganancia);

  return r;
}

function validateField(name, value, rule) {
  const errors = [];

  if (value === undefined || value === null || value === "") {
    if (rule.optional === false) {
      errors.push({ path: name, code: "required", message: "Campo requerido" });
    }
    return errors;
  }

  switch (rule.type) {
    case "string": {
      if (typeof value !== "string") {
        errors.push({ path: name, code: "type_error", message: "Debe ser string" });
      } else if (rule.min && value.trim().length < rule.min) {
        errors.push({ path: name, code: "too_small", message: `Debe tener al menos ${rule.min} caracteres` });
      }
      break;
    }
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors.push({ path: name, code: "type_error", message: "Debe ser número" });
      } else if (typeof rule.min === "number" && value < rule.min) {
        errors.push({ path: name, code: "too_small", message: `No puede ser menor que ${rule.min}` });
      }
      break;
    }
    case "mixed":
    default:
      // aceptamos cualquier cosa
      break;
  }

  return errors;
}

/**
 * Valida una fila. Devuelve:
 *  - { ok: true, data, errors: [] } si pasa
 *  - { ok: false, data: null, errors: [...] } si falla
 */
export function validateRow(raw) {
  const data = coerceProduct(raw);
  let errors = [];

  // validar sólo los campos del esquema; ignoramos extras
  for (const [name, rule] of Object.entries(rules)) {
    errors = errors.concat(validateField(name, data[name], rule));
  }

  if (errors.length) return { ok: false, data: null, errors };
  return { ok: true, data, errors: [] };
}
