// app/api/admin/logout/route.js
import { NextResponse } from "next/server";

export async function POST() {
  const name = process.env.AUTH_COOKIE_NAME || "admin_token";
  const res = NextResponse.json({ ok: true });
  res.cookies.set(name, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0, // borra cookie
  });
  return res;
}
