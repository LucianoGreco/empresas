// app/api/admin/pipeline/grais/reporte/route.js
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { isAdminApi } from "@/lib/admin";
import { CFG } from "@/lib/config";

export async function GET(req) {
  const ok = await isAdminApi(req);
  if (!ok) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const p = CFG.noEncontradosXlsx;
    if (!fs.existsSync(p)) return new NextResponse("Not Found", { status: 404 });
    const stat = await fs.promises.stat(p);
    const buf = await fs.promises.readFile(p);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="no_encontrados.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Server Error", { status: 500 });
  }
}
