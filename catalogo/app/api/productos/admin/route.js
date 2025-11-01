// D:\empresas\catalogo\app\api\productos\admin\route.js
export const runtime = "nodejs";

import { CFG } from "@/lib/config";
import { tryReadJson, normalizeRowStrict } from "@/lib/catalog";
import { isAdminApi } from "@/lib/admin";

export async function GET(req) {
  const ok = await isAdminApi(req);
  if (!ok) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const productosRaw = tryReadJson(CFG.jsonPath);
  const all = productosRaw.map((p, i) => normalizeRowStrict(p, i));
  return new Response(JSON.stringify(all), {
    headers: { "content-type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/* fin */
