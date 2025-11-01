// lib/csrf.js
// Doble-submit cookie CSRF: el cliente envía header "x-csrf-token" con el mismo valor que la cookie "csrf_token".
// Úsalo en POST/PUT/PATCH/DELETE.
//
// Ejemplo:
//   import { assertCsrf, setCsrfCookie } from "@/lib/csrf";
//   export async function GET() { return setCsrfCookie(NextResponse.json({ ok: true })); }
//   export async function POST(req) { assertCsrf(req); ... }

import { cookies } from "next/headers";

const CSRF_COOKIE = process.env.CSRF_COOKIE_NAME || "csrf_token";
const TTL_MINUTES = Number(process.env.CSRF_TTL_MINUTES || "60"); // 1h

// Polyfill seguro para crypto en Node y Edge runtimes
const crypto =
  globalThis.crypto ??
  (await import("node:crypto")).webcrypto;

function randToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Cookie no-httpOnly (el front debe leerla para mandarla en el header)
function cookieOpts() {
  return {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * TTL_MINUTES,
  };
}

export function getOrCreateCsrfToken() {
  const c = cookies().get(CSRF_COOKIE);
  if (c?.value) return c.value;
  const tok = randToken();
  cookies().set(CSRF_COOKIE, tok, cookieOpts());
  return tok;
}

export function setCsrfCookie(res) {
  const c = cookies().get(CSRF_COOKIE);
  const tok = c?.value || randToken();
  cookies().set(CSRF_COOKIE, tok, cookieOpts());
  return res;
}

export function assertCsrf(req) {
  const header = req.headers.get("x-csrf-token") || "";
  const cookie = cookies().get(CSRF_COOKIE)?.value || "";
  if (!cookie || !header || cookie !== header) {
    const err = new Error("CSRF token inválido");
    err.status = 403;
    throw err;
  }
}
