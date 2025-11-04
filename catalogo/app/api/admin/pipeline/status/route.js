// D:\empresas\catalogo\app\api\admin\pipeline\status\route.js
import fs from "fs";
import { NextResponse } from "next/server";
import { isAdminApi } from "@/lib/admin";
import { CFG } from "@/lib/config";

function statOrNull(path) {
  try {
    if (!path) return null;
    if (!fs.existsSync(path)) return { exists: false, path };
    const s = fs.statSync(path);
    return { exists: true, path, size: s.size, mtime: s.mtime };
  } catch {
    return { exists: false, path };
  }
}

export async function GET(req) {
  const ok = await isAdminApi(req);
  if (!ok) return new NextResponse("Unauthorized", { status: 401 });

  const origen = statOrNull(CFG.origenXlsxGrais);
  const destino = statOrNull(CFG.excelPath);
  const json = statOrNull(CFG.jsonPath);
  const reporte = statOrNull(CFG.noEncontradosXlsx);

  const actions = ["preview", "precios", "imagenes", "export", "todo"];

  return NextResponse.json(
    {
      ok: true,
      files: { origen, destino, json, reporte },
      actions,
      rootGestion: process.env.GESTION_ROOT || "D:/empresas/ferreluc/gestion",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/* fin */
