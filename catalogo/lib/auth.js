// lib/auth.js
import { prisma } from "@/lib/db";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE = process.env.USER_COOKIE_NAME || "user_session";
const TTL_DAYS = Number(process.env.USER_SESSION_TTL_DAYS || "7");

export async function hashPassword(plain) {
  const rounds = Number(process.env.PASSWORD_SALT_ROUNDS || "10");
  return bcrypt.hash(plain, rounds);
}

export async function verifyPassword(plain, hash) {
  // bcrypt.compare maneja salt y timing-safe
  return bcrypt.compare(plain, hash);
}

// Utilidad simple de sleep (para rate-limit blando)
export function sleep(ms = 300) {
  return new Promise((r) => setTimeout(r, ms));
}

export function ttlDate(days = TTL_DAYS) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// Opciones de cookie endurecidas
function cookieOptions(days = TTL_DAYS) {
  return {
    httpOnly: true,
    sameSite: "lax",                  // 'strict' puede romper algunos flujos; Lax es buen balance
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * days,
  };
}

export async function createSession(userId) {
  // Limpieza oportunista de expiradas (best-effort)
  try {
    await prisma.userSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  } catch {}

  const token = crypto.randomBytes(24).toString("hex");

  await prisma.userSession.create({
    data: {
      token,
      userId,
      expiresAt: ttlDate(),
    },
  });

  cookies().set(COOKIE, token, cookieOptions());
  return token;
}

// Sliding session: si faltan < 50% de vida, renueva TTL y cookie
async function maybeRefreshSession(sess) {
  try {
    const now = Date.now();
    const exp = new Date(sess.expiresAt).getTime();
    const created = new Date(sess.createdAt).getTime();
    const lifetime = exp - created;
    const remaining = exp - now;

    if (lifetime > 0 && remaining / lifetime < 0.5) {
      const newExp = ttlDate();
      await prisma.userSession.update({
        where: { token: sess.token },
        data: { expiresAt: newExp },
      });
      cookies().set(COOKIE, sess.token, cookieOptions()); // renueva maxAge
    }
  } catch {}
}

export async function getUserFromSession() {
  const c = cookies().get(COOKIE);
  if (!c?.value) return null;

  const sess = await prisma.userSession.findUnique({
    where: { token: c.value },
    include: { user: true },
  });

  if (!sess) {
    cookies().delete(COOKIE);
    return null;
  }

  if (sess.expiresAt && new Date(sess.expiresAt) < new Date()) {
    try { await prisma.userSession.delete({ where: { token: c.value } }); } catch {}
    cookies().delete(COOKIE);
    return null;
  }

  // Renovación deslizante
  await maybeRefreshSession(sess);

  return sess.user || null;
}
