// D:\empresas\catalogo\app\api\admin\pipeline\upload\route.js
import { NextResponse } from "next/server";
import { isAdminApi } from "@/lib/admin";
import fs from "fs";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads"); // guardamos dentro del proyecto

function ensureDir(p) {
  try { fs.mkdirSync(p, { recursive: true }); } catch {}
}

export async function POST(req) {
  const ok = await isAdminApi(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const kind = (url.searchParams.get("kind") || "misc").toLowerCase(); // "origen" | "destino" | "misc"

    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Falta archivo" }, { status: 400 });
    }

    const name = String(file.name || `upload_${Date.now()}`).replace(/[^\w.\-]/g, "_");
    const dir = path.join(UPLOAD_ROOT, kind);
    ensureDir(dir);

    const outPath = path.join(dir, `${Date.now()}_${name}`);
    const buff = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(outPath, buff);

    return NextResponse.json({ ok: true, path: outPath });
  } catch (e) {
    console.error("upload error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
