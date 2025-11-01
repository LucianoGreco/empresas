// app/api/admin/import/export/route.js
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { isAdminApi } from "@/lib/admin";
import { getCanonicalHeader, DEFAULT_ALLOWED } from "@/lib/import-constants";
import { validateRow } from "@/lib/validate";
import { assertCsrf } from "@/lib/csrf"; // <-- CSRF

const ALWAYS_KEEP = ["sku", "codigo_flexxus"];

function ensureAllowedCsv(allowedCsv) {
  const base = (String(allowedCsv || "").trim() || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (base.includes("*")) return "*";
  const set = new Set([...base, ...ALWAYS_KEEP]);
  if (set.size === 0) {
    DEFAULT_ALLOWED.forEach((k) => set.add(k));
    ALWAYS_KEEP.forEach((k) => set.add(k));
  }
  return Array.from(set).join(",");
}
function canonizeRow(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    const key = getCanonicalHeader(k);
    if (!key) continue;
    out[key] = v;
  }
  return out;
}
function filterAllowed(row, allowedCsv) {
  if (allowedCsv === "*") return row;
  const allowed = new Set(allowedCsv.split(",").map(s => s.trim()).filter(Boolean));
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (allowed.has(k) || ALWAYS_KEEP.includes(k)) out[k] = v;
  }
  return out;
}
function xlsxToRows(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const rows = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const r = XLSX.utils.sheet_to_json(ws, { defval: "" });
    rows.push(...r);
  }
  return rows;
}
function toCsv(rows) {
  if (!rows.length) return "row_index,field,code,message,value\n";
  const headers = ["row_index","field","code","message","value"];
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    const e = s.replace(/"/g, '""');
    return `"${e}"`;
  };
  const out = [headers.join(",")];
  for (const r of rows) {
    out.push([esc(r.row_index), esc(r.field), esc(r.code), esc(r.message), esc(r.value)].join(","));
  }
  return out.join("\n");
}

async function parsePayload(req) {
  const ct = req.headers.get("content-type") || "";
  let allowedCsv = "*";
  if (ct.startsWith("application/json")) {
    const body = await req.json();
    const sourcePath = String(body.sourcePath || "");
    allowedCsv = ensureAllowedCsv(body.allowed);
    if (!sourcePath) throw new Error("sourcePath requerido");
    const abs = path.resolve(sourcePath);
    if (!fs.existsSync(abs)) throw new Error("Archivo no encontrado en el servidor");
    const buf = await fs.promises.readFile(abs);
    return { buf, allowedCsv };
  } else {
    const form = await req.formData();
    const file = form.get("file");
    allowedCsv = ensureAllowedCsv(form.get("allowed"));
    if (!file || typeof file === "string") throw new Error("Falta archivo .xlsx en 'file'");
    const buf = Buffer.from(await file.arrayBuffer());
    return { buf, allowedCsv };
  }
}

export async function POST(req) {
  try {
    const ok = await isAdminApi(req);
    if (!ok) return new NextResponse("Unauthorized", { status: 401 });

    // CSRF para UI admin
    assertCsrf(req);

    const url = new URL(req.url);
    const format = (url.searchParams.get("format") || "csv").toLowerCase(); // csv | json
    const { buf, allowedCsv } = await parsePayload(req);

    const rawRows = xlsxToRows(buf);
    const errors = [];
    for (let i = 0; i < rawRows.length; i++) {
      const canon = filterAllowed(canonizeRow(rawRows[i]), allowedCsv);
      const res = validateRow(canon);
      if (!res.ok) {
        for (const e of res.errors) {
          errors.push({
            row_index: i + 1,
            field: e.path,
            code: e.code,
            message: e.message,
            value: canon[e.path] ?? null,
          });
        }
      }
    }

    if (format === "json") {
      return new NextResponse(JSON.stringify({ ok: true, count: errors.length, errors }, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="import_errors.json"`,
          "Cache-Control": "no-store",
        },
      });
    } else {
      const csv = toCsv(errors);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="import_errors.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }
  } catch (err) {
    console.error("export error:", err);
    const status = err?.status && Number.isFinite(err.status) ? err.status : 400;
    return new NextResponse(String(err?.message || err), { status });
  }
}

/* fin */
