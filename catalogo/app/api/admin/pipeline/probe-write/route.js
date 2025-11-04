// D:\empresas\catalogo\app\api\admin\pipeline\probe-write\route.js
import { NextResponse } from "next/server";
import { isAdminApi } from "@/lib/admin";
import fs from "fs";
import path from "path";

export async function POST(req) {
  const ok = await isAdminApi(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const outPath = String(body?.path || "").trim();
    if (!outPath) return NextResponse.json({ ok: false, error: "Ruta vacía" }, { status: 400 });

    const dir = path.dirname(outPath);
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    const tmp = path.join(dir, `.probe.${Date.now()}.tmp`);

    fs.writeFileSync(tmp, "probe");
    fs.rmSync(tmp, { force: true });

    return NextResponse.json({ ok: true, dir, path: outPath });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
