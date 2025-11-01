// D:\empresas\catalogo\app\api\productos\admin\import\route.js
// DEPRECADO: usar /api/admin/import
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Este endpoint fue deprecado. Usá /api/admin/import." },
    { status: 410 }
  );
}

export const GET = POST;
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;

/* fin */
