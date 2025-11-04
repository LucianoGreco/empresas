// app/api/admin/pipeline/grais/route.js
import { NextResponse } from "next/server";
import { isAdminApi } from "@/lib/admin";
import {
  preview,
  aplicarPrecios,
  colocarImagenes,
  exportarJson,
  runAll,
} from "@/lib/etl-grais-shared.js";

async function handle(req) {
  const ok = await isAdminApi(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let overrides = {};
  if (req.method === "POST") {
    try { overrides = await req.json(); } catch { overrides = {}; }
  }

  try {
    const url = new URL(req.url);
    const action = (url.searchParams.get("action") || "").toLowerCase();

    switch (action) {
      case "preview":
        return NextResponse.json({ ok: true, data: preview(overrides) }, { headers: { "Cache-Control": "no-store" } });
      case "precios":
        return NextResponse.json({ ok: true, data: aplicarPrecios(overrides) });
      case "imagenes":
        return NextResponse.json({ ok: true, data: colocarImagenes(overrides) });
      case "export":
        return NextResponse.json({ ok: true, data: exportarJson(overrides) });
      case "todo":
        return NextResponse.json({ ok: true, data: runAll(overrides) });
      default:
        return NextResponse.json({ error: "action inválida. Usa: ?action=preview|precios|imagenes|export|todo" }, { status: 400 });
    }
  } catch (e) {
    const status = e?.status || (e?.code === "ENOENT" ? 404 : 500);
    const msg = e?.message || "Server error";
    console.error("pipeline/grais error:", e);
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req) { return handle(req); }
export async function GET(req) { return handle(req); }

/* fin */
