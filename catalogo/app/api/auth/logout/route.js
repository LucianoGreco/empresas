// app/api/auth/logout/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const COOKIE = process.env.USER_COOKIE_NAME || "user_session";

export async function POST() {
  try {
    // 1) eliminar sesión en DB si existe cookie
    const c = cookies().get(COOKIE);
    if (c?.value) {
      try {
        await prisma.userSession.delete({ where: { token: c.value } });
      } catch {
        // si no existe, no pasa nada
      }
      cookies().delete(COOKIE);
    }

    // 2) OK
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
