// app/api/admin/login/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  const {
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    ADMIN_TOKEN,
    AUTH_COOKIE_NAME = "admin_token",
    NODE_ENV,
  } = process.env;

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").toLowerCase().trim();
  const password = String(body?.password || "");
  const passthrough = req.headers.get("x-admin-token") || "";

  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax",
    secure: NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  };

  // 1) x-admin-token directo
  if (passthrough && ADMIN_TOKEN && passthrough === ADMIN_TOKEN) {
    const res = NextResponse.json({ ok: true, via: "token" });
    res.cookies.set(AUTH_COOKIE_NAME, ADMIN_TOKEN, cookieOpts);
    return res;
  }

  // 2) Email/password
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y password son obligatorios" },
      { status: 400 }
    );
  }
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_TOKEN) {
    return NextResponse.json(
      { error: "Variables ADMIN_* faltantes" },
      { status: 500 }
    );
  }
  if (email !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  // 3) Cookie con token maestro
  const res = NextResponse.json({ ok: true, via: "password" });
  res.cookies.set(AUTH_COOKIE_NAME, ADMIN_TOKEN, cookieOpts);
  return res;
}
