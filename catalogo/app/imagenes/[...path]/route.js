// Sirve imágenes físicas desde CFG.imgsDir con tolerancia de nombre.
// Protecciones: path traversal, extensión permitida, ETag/304.

import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { CFG, ALLOWED_IMAGE_EXTS, toPosix } from "@/lib/config";

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
};

function normalizeRequestedPath(parts) {
  const joined = parts.join("/");
  const s = toPosix(joined).replace(/^\/+/, "");
  return s.startsWith("imagenes/") ? s.slice("imagenes/".length) : s;
}

function safeJoin(baseDir, relPath) {
  const p = path.join(baseDir, relPath);
  const normBase = path.resolve(baseDir);
  const normPath = path.resolve(p);
  if (!normPath.startsWith(normBase)) return null;
  return normPath;
}

function findFileLoose(absBase) {
  if (fs.existsSync(absBase) && fs.statSync(absBase).isFile()) return absBase;

  const dir = path.dirname(absBase);
  const wantBase = path.basename(absBase);
  const wantLow = wantBase.toLowerCase();

  if (!fs.existsSync(dir)) return null;

  // 1) case-insensitive
  for (const f of fs.readdirSync(dir)) {
    if (f.toLowerCase() === wantLow) {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isFile()) return fp;
    }
  }

  // 2) sin extensión → probar permitidas
  if (!path.extname(wantLow)) {
    for (const ext of ALLOWED_IMAGE_EXTS) {
      const cand = path.join(dir, wantBase + ext);
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
    }
  }
  return null;
}

function buildResponseForFile(filePath) {
  const stat = fs.statSync(filePath);
  const etag = `"${stat.size}-${Number(stat.mtimeMs)}"`;
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  const buf = fs.readFileSync(filePath);

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(buf.length),
      "Last-Modified": stat.mtime.toUTCString(),
      ETag: etag,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "none",
    },
  });
}

export async function GET(req, { params }) {
  try {
    const parts = Array.isArray(params?.path) ? params.path : [];
    if (!parts.length) return new NextResponse("Not Found", { status: 404 });

    const decoded = parts.map((p) => {
      try { return decodeURIComponent(p); } catch { return p; }
    });

    const rel = normalizeRequestedPath(decoded);
    const joined = safeJoin(CFG.imgsDir, rel);
    if (!joined) return new NextResponse("Forbidden", { status: 403 });

    const reqExt = path.extname(joined).toLowerCase();
    if (reqExt && !ALLOWED_IMAGE_EXTS.includes(reqExt)) {
      return new NextResponse("Unsupported Media Type", { status: 415 });
    }

    let filePath = findFileLoose(joined);

    if (!filePath) {
      const fallback = path.join(CFG.imgsDir, "sin_imagen.png");
      if (!fs.existsSync(fallback)) return new NextResponse("Not Found", { status: 404 });
      filePath = fallback;
    }

    // Condicionales
    const stat = fs.statSync(filePath);
    const etag = `"${stat.size}-${Number(stat.mtimeMs)}"`;
    const ifNone = req.headers.get("if-none-match");
    const ifMod = req.headers.get("if-modified-since");
    if ((ifNone && ifNone === etag) || (ifMod && new Date(ifMod) >= stat.mtime)) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return buildResponseForFile(filePath);
  } catch (err) {
    console.error("[imagenes route] error:", err.message);
    return new NextResponse("Server Error", { status: 500 });
  }
}

export async function HEAD(req, ctx) {
  const res = await GET(req, ctx);
  return new NextResponse(null, { status: res.status, headers: res.headers });
}
