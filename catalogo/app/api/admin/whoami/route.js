// app/api/admin/whoami/route.js
// Responde si hay admin por token maestro (cookie/header/bearer) o sesión con role 'admin'.
// Formato: { admin: boolean, via: 'token'|'session'|null, user?: {...} }

import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";

function hasMasterTokenInHeaders(req) {
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
  const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "admin_token";
  if (!ADMIN_TOKEN) return false;

  // cookie
  const cookieTok =
    req.headers.get("cookie")?.split(";")
      .map(s => s.trim())
      .find(s => s.startsWith(`${AUTH_COOKIE_NAME}=`))
      ?.split("=")[1] || "";

  // header x-admin-token
  const headerTok = req.headers.get("x-admin-token") || "";

  // bearer
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";

  // Importante: NO aceptamos ?admin_token= en query (riesgo de filtrado)
  return [cookieTok, headerTok, bearer].some(t => t && t === ADMIN_TOKEN);
}

export async function GET(req) {
  try {
    // 1) token maestro vía cookie/header/bearer
    if (hasMasterTokenInHeaders(req)) {
      return NextResponse.json({ admin: true, via: "token" });
    }

    // 2) sesión de usuario con role=admin
    const user = await getUserFromSession();
    if (user?.isActive && user?.role === "admin") {
      return NextResponse.json({
        admin: true,
        via: "session",
        user: { id: user.id, email: user.email, name: user.name || null, role: user.role },
      });
    }

    return NextResponse.json({ admin: false, via: null });
  } catch (e) {
    console.error("[api/admin/whoami] error", e);
    return NextResponse.json({ admin: false, via: null, error: e?.message || "Server error" }, { status: 500 });
  }
}
