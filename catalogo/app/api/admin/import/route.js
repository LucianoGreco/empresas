import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { CFG, ensureDir } from "@/lib/config";
import { getCanonicalHeader, DEFAULT_ALLOWED } from "@/lib/import-constants";
import { tryReadJson } from "@/lib/catalog";
import { runImportPipeline } from "@/lib/import-service";
import { isAdminApi } from "@/lib/admin";
import { assertCsrf, setCsrfCookie } from "@/lib/csrf"; // <-- CSRF

// === Constantes internas ===
const ALWAYS_KEEP = ["sku", "codigo_flexxus"];

// === Utils ===
function ensureAllowedCsv(allowedCsv) {
  const base = (String(allowedCsv || "").trim() || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (base.includes("*")) return "*";

  const set = new Set([...base, ...ALWAYS_KEEP]);
  if (set.size === 0) {
    DEFAULT_ALLOWED.forEach((k) => set.add(k));
    ALWAYS_KEEP.forEach((k) => set.add(k));
  }
  return Array.from(set).join(",");
}

async function parseXlsxBufferToObjects(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const outRows = [];
  const headersSet = new Set();

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    for (const raw of rows) {
      Object.keys(raw).forEach((k) => headersSet.add(k));
      outRows.push(raw);
    }
  }

  const headers = Array.from(
    new Set(Array.from(headersSet).map((h) => getCanonicalHeader(h)))
  ).filter(Boolean);

  return { rows: outRows, headers };
}

async function parseXlsxFromServerPath(sourcePath) {
  const abs = path.resolve(sourcePath);
  if (!fs.existsSync(abs)) throw new Error("Archivo no encontrado en el servidor");
  const buf = await fs.promises.readFile(abs);
  return parseXlsxBufferToObjects(buf);
}

// === Handlers internos (multipart / json) ===
async function handleMultipart(req) {
  const form = await req.formData();
  const file = form.get("file");
  const strategy = String(form.get("strategy") || "merge").toLowerCase();
  const preview = String(form.get("preview") || "").toLowerCase() === "true";
  const allowedCsv = ensureAllowedCsv(form.get("allowed"));

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Falta archivo .xlsx en campo 'file'." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const { rows, headers } = await parseXlsxBufferToObjects(buf);

  if (preview) {
    return NextResponse.json({
      ok: true,
      preview: {
        count_in: rows.length,
        headers: headers.map((h) => ({ header: h, key: h })),
        rows: rows.slice(0, 20),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  }

  await ensureDir(path.dirname(CFG.jsonPath));
  const res = await runImportPipeline({
    rows,
    headers: null,
    allowed: allowedCsv,
    strategy,
  });

  // Invalida todo fetch con tag 'catalog'
  revalidateTag("catalog");

  return new NextResponse(JSON.stringify({
    ok: true,
    strategy,
    allowed: allowedCsv === "*" ? "*" : allowedCsv.split(","),
    count_out: res.count,
    path: res.path,
    stats: res.stats,
  }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function handleJson(req) {
  const body = await req.json();
  const sourcePath = String(body.sourcePath || "");
  const strategy = String(body.strategy || "merge").toLowerCase();
  const preview = Boolean(body.preview);
  const allowedCsv = ensureAllowedCsv(body.allowed);

  if (!sourcePath) {
    return NextResponse.json({ error: "sourcePath requerido" }, { status: 400 });
  }

  const { rows, headers } = await parseXlsxFromServerPath(sourcePath);

  if (preview) {
    return NextResponse.json({
      ok: true,
      preview: {
        count_in: rows.length,
        headers: headers.map((h) => ({ header: h, key: h })),
        rows: rows.slice(0, 20),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  }

  await ensureDir(path.dirname(CFG.jsonPath));
  const res = await runImportPipeline({
    rows,
    headers: null,
    allowed: allowedCsv,
    strategy,
  });

  revalidateTag("catalog");

  return new NextResponse(JSON.stringify({
    ok: true,
    strategy,
    allowed: allowedCsv === "*" ? "*" : allowedCsv.split(","),
    count_out: res.count,
    path: res.path,
    stats: res.stats,
  }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// === HTTP Methods ===

// Preview de catálogo ya generado + sample
export async function GET() {
  try {
    const data = tryReadJson(CFG.jsonPath);
    return setCsrfCookie(NextResponse.json({
      ok: true,
      count: Array.isArray(data) ? data.length : 0,
      path: CFG.jsonPath,
      sample: Array.isArray(data) ? data.slice(0, 3) : [],
    }, { headers: { "Cache-Control": "no-store" } }));
  } catch {
    return setCsrfCookie(NextResponse.json({ ok: false, count: 0 }, { status: 200, headers: { "Cache-Control": "no-store" } }));
  }
}

// Importar (multipart o JSON) — PROTEGIDO ADMIN + CSRF
export async function POST(req) {
  try {
    const ok = await isAdminApi(req);
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    assertCsrf(req);

    const ct = req.headers.get("content-type") || "";
    if (ct.startsWith("application/json")) {
      return await handleJson(req);
    }
    return await handleMultipart(req);
  } catch (err) {
    console.error("admin/import POST error:", err);
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return NextResponse.json({ error: err?.message || "Server error" }, { status, headers: { "Cache-Control": "no-store" } });
  }
}

// Borrar catálogo (vacía el JSON) — PROTEGIDO ADMIN + CSRF
export async function DELETE(req) {
  try {
    const ok = await isAdminApi(req);
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    assertCsrf(req);

    await ensureDir(path.dirname(CFG.jsonPath));
    const existed = fs.existsSync(CFG.jsonPath);
    const before = existed ? tryReadJson(CFG.jsonPath).length : 0;
    const tmp = `${CFG.jsonPath}.tmp`;
    fs.writeFileSync(tmp, "[]", "utf-8");
    fs.renameSync(tmp, CFG.jsonPath);

    // Invalida todo fetch con tag 'catalog'
    revalidateTag("catalog");

    return new NextResponse(JSON.stringify({
      ok: true,
      cleared: true,
      previous_count: before,
      path: CFG.jsonPath,
    }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("admin/import DELETE error:", err);
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return NextResponse.json({ error: err?.message || "Server error" }, { status, headers: { "Cache-Control": "no-store" } });
  }
}

/* fin */
