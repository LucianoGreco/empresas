// D:\empresas\catalogo\app\admin\productos\update\route.js
// PATCH { codigo_flexxus, changes: { venta, mayorista, inventario, marca, imagen, moneda, nombre_descripcion, categoria } }
import fs from "fs";
import { NextResponse } from "next/server";
import { CFG, sanitizeImage } from "@/lib/config";

export async function PATCH(req) {
  const body = await req.json().catch(() => ({}));
  const code = String(body?.codigo_flexxus || "").trim();
  const changes = body?.changes || {};
  if (!code) return NextResponse.json({ error: "codigo_flexxus requerido" }, { status: 400 });

  const data = fs.existsSync(CFG.jsonPath) ? JSON.parse(fs.readFileSync(CFG.jsonPath, "utf-8")) : [];
  const i = data.findIndex((r) => String(r.codigo_flexxus || "").trim() === code);
  if (i === -1) return NextResponse.json({ error: "No existe el código" }, { status: 404 });

  const allowed = new Set(["venta","mayorista","inventario","marca","imagen","moneda","nombre_descripcion","categoria"]);
  const next = { ...data[i] };

  for (const [k,v] of Object.entries(changes)) {
    if (!allowed.has(k)) continue;
    if (k === "imagen") next[k] = sanitizeImage(v);
    else next[k] = v;
  }

  data[i] = next;
  fs.writeFileSync(CFG.jsonPath, JSON.stringify(data, null, 2), "utf-8");
  return NextResponse.json({ ok: true, item: next });
}
