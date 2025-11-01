export const dynamic = "force-dynamic";

import fs from "fs";
import { sanitizeImage } from "@/lib/config";
import { getUserFromSession } from "@/lib/auth";
import Catalog from "@/components/Catalog";

const GESTION_JSON = "D:\\empresas\\ferreluc\\gestion\\json\\producto_grais.json";

function tryReadJson(absPath) {
  try {
    if (!fs.existsSync(absPath)) return [];
    const raw = fs.readFileSync(absPath, "utf-8").trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return [parsed];
    return [];
  } catch {
    return [];
  }
}

function mapProducts(items) {
  return (items || [])
    .filter((p) => p && typeof p === "object")
    .map((p, idx) => {
      const img = sanitizeImage(
        typeof p.imagen === "string" && p.imagen.trim() ? p.imagen : ""
      );

      return {
        id: `${p.codigo_flexxus || p.codigo || idx}`,
        codigo_flexxus: p.codigo_flexxus ?? "",
        nombre_descripcion: p.nombre_descripcion ?? p.descripcion_flexxus ?? "Sin nombre",
        costo: Number(p.costo ?? 0),
        venta: Number(p.venta ?? p.precio_venta ?? 0),
        mayorista: Number(p.mayorista ?? 0),
        inventario: Number(p.inventario ?? 0),
        inv_minimo: Number(p.inv_minimo ?? 0),
        inv_maximo: Number(p.inv_maximo ?? 0),
        proveedor: p.proveedor ?? "",
        descripcion_flexxus: p.descripcion_flexxus ?? "",
        precio_venta: Number(p.precio_venta ?? 0),
        caja: Number(p.caja ?? 0),
        iva: Number(p.iva ?? 0),
        ganancia: Number(p.ganancia ?? 0),
        imagen: img,
        marca: p.marca ?? "",
        categoria: p.categoria ?? "",
        moneda: p.moneda ?? "",
      };
    });
}

export default async function Page() {
  const user = await getUserFromSession();

  if (!user) {
    return (
      <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui" }}>
        <h1>Catálogo</h1>
        <div
          style={{
            marginTop: 16,
            padding: 16,
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            background: "#fff",
          }}
        >
          <p style={{ fontSize: 16 }}>
            Para ver el catálogo necesitás iniciar sesión y que tu usuario haya sido aprobado.
          </p>
          <ul style={{ marginTop: 10, lineHeight: 1.8 }}>
            <li>
              <a href="/login">Ingresar</a> si ya tenés cuenta aprobada.
            </li>
            <li>
              <a href="/register">Registrarme</a> si todavía no tenés cuenta.
            </li>
          </ul>
        </div>
      </div>
    );
  }

  const productos = mapProducts(tryReadJson(GESTION_JSON));

  // Pasamos info de rol a Catalog
  return <Catalog products={productos} userRole={user.role} />;
}
