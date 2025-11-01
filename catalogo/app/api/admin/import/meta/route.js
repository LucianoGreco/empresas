// app/api/admin/import/meta/route.js
import { NextResponse } from "next/server";
import { isAdminApi } from "@/lib/admin";
import {
  DEFAULT_ALLOWED,
  HEADER_MAP,
  PREFERRED_ORDER,
} from "@/lib/import-constants";

const ALWAYS_KEEP = ["sku", "codigo_flexxus"];

export async function GET(req) {
  const ok = await isAdminApi(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Entregamos metadata para UI de importación
  const payload = {
    ok: true,
    DEFAULT_ALLOWED,
    HEADER_MAP,
    PREFERRED_ORDER,
    ALWAYS_KEEP,
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      // Evitar cachear info sensible de configuración admin
      "Cache-Control": "no-store",
    },
  });
}

/* fin */
