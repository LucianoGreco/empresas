// middleware.js
import { NextResponse } from "next/server";

/**
 * CONFIG
 */
const ADMIN_COOKIE = process.env.AUTH_COOKIE_NAME || "admin_token";
const ADMIN_TOKEN  = process.env.ADMIN_TOKEN || "";
const USER_COOKIE  = process.env.USER_COOKIE_NAME || "user_session";

// Por defecto, en prod NO aceptamos token por query. En dev sí (comodidad).
const ALLOW_QUERY_ADMIN_TOKEN = (
  process.env.ALLOW_QUERY_ADMIN_TOKEN ??
  (process.env.NODE_ENV !== "production" ? "true" : "false")
) === "true";

function removeQueryAdminToken(url) {
  const clean = new URL(url.toString());
  clean.searchParams.delete("admin_token");
  return clean;
}
function bearerToken(req) {
  const h = req.headers.get("authorization");
  if (!h) return null;
  const [type, token] = h.split(" ");
  if ((type || "").toLowerCase() !== "bearer") return null;
  return token || null;
}
function hasMasterToken(req) {
  if (!ADMIN_TOKEN) return false;

  const cookieTok = req.cookies.get(ADMIN_COOKIE)?.value || "";
  const headerTok = req.headers.get("x-admin-token") || "";
  const bearer = bearerToken(req) || "";
  const qTok = req.nextUrl.searchParams.get("admin_token") || "";

  const candidates = [cookieTok, headerTok, bearer];
  if (ALLOW_QUERY_ADMIN_TOKEN) candidates.push(qTok);

  return candidates.some((t) => t && t === ADMIN_TOKEN);
}
function hasUserSessionCookie(req) {
  return Boolean(req.cookies.get(USER_COOKIE)?.value);
}
function safeRedirectPath(p) {
  if (typeof p !== "string") return "/";
  try {
    const u = new URL(p, "http://local");
    const path = u.pathname.startsWith("/") ? u.pathname : "/";
    return path + (u.search || "");
  } catch {
    return p.startsWith("/") ? p : "/";
  }
}

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // públicas
  if (
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/logo.ico" ||
    pathname.startsWith("/imagenes") ||
    pathname.startsWith("/api/productos") ||
    pathname.startsWith("/api/checkout") ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/admin/login" ||
    pathname === "/login" ||
    pathname === "/register"
  ) {
    return NextResponse.next();
  }

  const isAdminApi = pathname.startsWith("/api/admin/");
  const isAdminUi  = pathname.startsWith("/admin/");
  const isOrdersUi = pathname.startsWith("/orders");

  // ?admin_token= manejo
  const qTok = req.nextUrl.searchParams.get("admin_token");
  if ((isAdminApi || isAdminUi) && qTok) {
    if (!ALLOW_QUERY_ADMIN_TOKEN) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (ADMIN_TOKEN && qTok === ADMIN_TOKEN) {
      const res = NextResponse.redirect(removeQueryAdminToken(req.nextUrl));
      res.cookies.set(ADMIN_COOKIE, ADMIN_TOKEN, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // /api/admin/*
  if (isAdminApi) {
    if (hasMasterToken(req) || hasUserSessionCookie(req)) {
      return NextResponse.next();
    }
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // /admin/*
  if (isAdminUi) {
    if (hasMasterToken(req) || hasUserSessionCookie(req)) {
      return NextResponse.next();
    }
    const redirectParam = req.nextUrl.searchParams.get("redirect") || pathname;
    const safePath = safeRedirectPath(redirectParam);
    const loginUrl = new URL("/admin/login", req.nextUrl.origin);
    loginUrl.searchParams.set("redirect", safePath);
    return NextResponse.redirect(loginUrl);
  }

  // 🔒 /orders y /orders/*
  if (isOrdersUi) {
    // solo admin/token o al menos sesión (y luego el handler filtra)
    if (hasMasterToken(req) || hasUserSessionCookie(req)) {
      return NextResponse.next();
    }
    // si no hay sesión, al login
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/orders/:path*"],
};
