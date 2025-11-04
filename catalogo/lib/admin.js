// lib/admin.js
import { cookies, headers } from "next/headers";
import { getUserFromSession } from "@/lib/auth";

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

function adminTokenFromFetchReq(req) {
  const { ADMIN_TOKEN = "", AUTH_COOKIE_NAME = "admin_token" } = process.env;
  if (!ADMIN_TOKEN) return "";
  const cookieHeader = req.headers.get("cookie") || "";
  const cookieTok = getCookieFromHeader(cookieHeader, AUTH_COOKIE_NAME);
  const headerTok = req.headers.get("x-admin-token") || "";
  const auth = req.headers.get("authorization") || "";
  let bearerTok = "";
  if (auth.toLowerCase().startsWith("bearer ")) bearerTok = auth.slice(7).trim();
  const token = cookieTok || headerTok || bearerTok || "";
  return token === ADMIN_TOKEN ? token : "";
}

function adminTokenFromRsc() {
  const { ADMIN_TOKEN = "", AUTH_COOKIE_NAME = "admin_token" } = process.env;
  if (!ADMIN_TOKEN) return "";
  const c = cookies();
  const cookieTok = c.get(AUTH_COOKIE_NAME)?.value || "";
  const h = headers();
  const headerTok = h.get("x-admin-token") || "";
  const auth = h.get("authorization") || "";
  let bearerTok = "";
  if (String(auth).toLowerCase().startsWith("bearer ")) bearerTok = auth.slice(7).trim();
  const token = cookieTok || headerTok || bearerTok || "";
  return token === ADMIN_TOKEN ? token : "";
}

export async function isAdminApi(req) {
  if (adminTokenFromFetchReq(req)) return true;
  try {
    const user = await getUserFromSession();
    if (user?.role === "admin" && user?.isActive) return true;
  } catch {}
  return false;
}

export async function isAdminPage() {
  if (adminTokenFromRsc()) return true;
  try {
    const user = await getUserFromSession();
    return !!(user?.role === "admin" && user?.isActive);
  } catch {
    return false;
  }
}

/* fin */
