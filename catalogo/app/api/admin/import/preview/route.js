// app/api/admin/import/preview/route.js
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { isAdminApi } from "@/lib/admin";
import { getCanonicalHeader, DEFAULT_ALLOWED } from "@/lib/import-constants";
import { validateRow } from "@/lib/validate";

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

async function parseMultipart(req) {
  const form = await req.formData();
  const file = form.get("file");
  const allowedCsv = ensureAllowedCsv(form.get("allowed"));
  const limit = Math.max(1, Math.min(1000, Number(form.get("limit") || 200)));
  if (!file || typeof file === "string") throw new Error("Falta archivo .xlsx en 'file'");

  const buf = Buffer.from(await file.arrayBuffer());
  return { buf, allowedCsv, limit };
}

async function parseJson(req) {
  const body = await req.json();
  const sourcePath = String(body.sourcePath || "");
  const allowedCsv = ensureAllowedCsv(body.allowed);
  const limit = Math.max(1, Math.min(1000, Number(body.limit || 200)));
  if (!sourcePath) throw new Error("sourcePath requerido");

  const abs = path.resolve(sourcePath);
  if (!fs.existsSync(abs)) throw new Error("Archivo no encontrado en el servidor");
  const buf = await fs.promises.readFile(abs);
  return { buf, allowedCsv, limit };
}

function xlsxToRows(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const rows = [];
  const headerSet = new Set();
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const r = XLSX.utils.sheet_to_json(ws, { defval: "" });
    for (const raw of r) {
      Object.keys(raw).forEach((k) => headerSet.add(k));
      rows.push(raw);
    }
  }
  // Filtramos headers vacíos tras canonizar
  const headers = [...new Set(Array.from(headerSet).map(getCanonicalHeader))].filter(Boolean);
  return { rows, headers };
}

function validateAll(rows, allowedCsv, limit) {
  let total = 0, valid = 0, invalid = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    total++;
    const canon = canonizeRow(rows[i]);
    const filtered = filterAllowed(canon, allowedCsv);
    const res = validateRow(filtered);
    if (res.ok) {
      valid++;
    } else {
      invalid++;
      if (errors.length < limit) {
        for (const e of res.errors) {
          errors.push({
            row_index: i + 1, // 1-based
            field: e.path,
            code: e.code,
            message: e.message,
            value: filtered[e.path] ?? null,
          });
        }
      }
    }
  }

  return {
    stats: { total, valid, invalid, error_items: errors.length },
    errors,
  };
}

export async function POST(req) {
  try {
    const ok = await isAdminApi(req);
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ct = req.headers.get("content-type") || "";
    const { buf, allowedCsv, limit } = ct.startsWith("application/json")
      ? await parseJson(req)
      : await parseMultipart(req);

    const { rows, headers } = xlsxToRows(buf);
    const { stats, errors } = validateAll(rows, allowedCsv, limit);

    return NextResponse.json({
      ok: true,
      preview: {
        count_in: rows.length,
        headers: headers.map((h) => ({ header: h, key: h })),
        stats,
        errors,
        sample_rows: rows.slice(0, 10),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("preview error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 400 });
  }
}

/* fin */
