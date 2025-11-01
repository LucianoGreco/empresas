// app/api/admin/users/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminApi } from "@/lib/admin";

// GET: lista de usuarios (solo admin)
export async function GET(req) {
  const ok = await isAdminApi(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json(users);
}

// PUT/PATCH: actualizar isActive o role (solo admin)
async function updateUser(req) {
  const ok = await isAdminApi(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || "");
  const hasIsActive = Object.prototype.hasOwnProperty.call(body, "isActive");
  const hasRole = Object.prototype.hasOwnProperty.call(body, "role");

  if (!id || (!hasIsActive && !hasRole)) {
    return NextResponse.json(
      { error: "Falta id o campos a actualizar" },
      { status: 400 }
    );
  }

  const data = {};
  if (hasIsActive) data.isActive = !!body.isActive;
  if (hasRole) {
    const role = String(body.role || "user").toLowerCase();
    if (!["user", "admin"].includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }
    data.role = role;
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, isActive: true, role: true, updatedAt: true },
  });

  return NextResponse.json(updated);
}

export async function PUT(req) {
  try { return await updateUser(req); }
  catch (e) { return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 }); }
}

export async function PATCH(req) {
  try { return await updateUser(req); }
  catch (e) { return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 }); }
}
