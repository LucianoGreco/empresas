// lib/admin.js
import { getUserFromSession } from "@/lib/auth";

/**
 * Extrae valor de una cookie a partir del header Cookie.
 */
function getCookieFromHeader(cookieHeader = "", name) {
  const parts = String(cookieHeader)
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);


  for (const p of parts) {
    const [k, ...rest] = p.split("=");
    if (k === name) return rest.join("=");
  }
  return "";
}

/**
 * Devuelve un token de admin si llega por:
 * - Cookie AUTH_COOKIE_NAME
 * - Header "x-admin-token"
 * - Header "Authorization: Bearer <token>"
 *
 * Nota: NO aceptamos ?admin_token= en la URL para evitar filtrado por logs y referers.
 */
function adminTokenFromReq(req) {
  const {
    ADMIN_TOKEN = "",
    AUTH_COOKIE_NAME = "admin_token",
  } = process.env;

  if (!ADMIN_TOKEN) return "";

  // 1) Cookie header crudo (en route handlers el objeto Request no siempre expone req.cookies)
  const cookieHeader = req.headers.get("cookie") || "";
  const cookieTok = getCookieFromHeader(cookieHeader, AUTH_COOKIE_NAME);

  // 2) Headers
  const headerTok = req.headers.get("x-admin-token") || "";
  const auth = req.headers.get("authorization") || "";
  let bearerTok = "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    bearerTok = auth.slice(7).trim();
  }

  // Prioridad: cookie → header → bearer
  const token = cookieTok || headerTok || bearerTok || "";
  if (token && token === ADMIN_TOKEN) return token;

  return "";
}

/**
 * Chequea si el request es "admin":
 * - Si tiene el ADMIN_TOKEN por cookie/header → true
 * - Sino, si hay sesión de usuario con role === 'admin' → true
 * - En caso contrario → false
 */
export async function isAdminApi(req) {
  // Token maestro
  if (adminTokenFromReq(req)) return true;

  // Usuario logueado con rol 'admin'
  try {
    const user = await getUserFromSession();
    if (user?.role === "admin" && user?.isActive) return true;
  } catch {
    // ignorar
  }
  return false;
}

/* fin */
