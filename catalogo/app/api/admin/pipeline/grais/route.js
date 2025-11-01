// D:\empresas\catalogo\app\api\admin\pipeline\grais\route.js
import { NextResponse } from "next/server";
import { isAdminApi } from "@/lib/admin";
import {
  preview,
  aplicarPrecios,
  colocarImagenes,
  exportarJson,
  runAll,
} from "@/lib/pipeline-grais";

export async function POST(req) {
  try {
    const ok = await isAdminApi(req);
    if (!ok)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const action = (url.searchParams.get("action") || "").toLowerCase();

    switch (action) {
      case "preview":
        return NextResponse.json(
          { ok: true, data: preview() },
          { headers: { "Cache-Control": "no-store" } }
        );
      case "precios":
        return NextResponse.json({ ok: true, data: aplicarPrecios() });
      case "imagenes":
        return NextResponse.json({ ok: true, data: colocarImagenes() });
      case "export":
        return NextResponse.json({ ok: true, data: exportarJson() });
      case "todo":
        return NextResponse.json({ ok: true, data: runAll() });
      default:
        return NextResponse.json(
          {
            error:
              "action inválida. Usa: ?action=preview|precios|imagenes|export|todo",
          },
          { status: 400 }
        );
    }
  } catch (e) {
    console.error("pipeline/grais error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
