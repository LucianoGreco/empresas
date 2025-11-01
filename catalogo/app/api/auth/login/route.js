// app/api/auth/login/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession, sleep } from "@/lib/auth";

const GENERIC_ERR = "Credenciales inválidas"; // uniforme para no filtrar estado

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").toLowerCase().trim();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email y password son obligatorios" }, { status: 400 });
    }

    // Búsqueda + respuesta uniforme
    const user = await prisma.user.findUnique({ where: { email } });

    // Comparación siempre (si existe o no) para mitigar oracle de tiempo
    const hashed = user?.passwordHash || "$2a$10$invalidinvalidinvalidinvalidinvalidinva"; // dummy hash válido
    const ok = await verifyPassword(password, hashed);

    // Pequeña pausa ante fallo para micro-rate-limit (sin estado)
    if (!user || !ok) {
      await sleep(350);
      return NextResponse.json({ error: GENERIC_ERR }, { status: 401 });
    }

    if (!user.isActive) {
      // mantenemos mensaje específico aquí (tu UX actual lo diferencia)
      return NextResponse.json({ error: "Usuario no aprobado por el administrador" }, { status: 403 });
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
