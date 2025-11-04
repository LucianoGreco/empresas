// app/api/cliente/route.js
import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { getClienteByUserId, upsertClienteByUserId } from "@/lib/client-profile";

export async function GET() {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json({ __anonymous: true }, { status: 200 });
  }

  const cliente = await getClienteByUserId(user.id);
  return NextResponse.json(cliente || {}, { status: 200 });
}

export async function PUT(req) {
  const body = await req.json();

  if (!body.email || !body.nombreCompleto) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios: nombreCompleto, email" },
      { status: 400 }
    );
  }

  const user = await getUserFromSession();

  if (!user) {
    return NextResponse.json(
      {
        ok: true,
        anonymous: true,
        ...body, // ← FIX: antes decía ".body," y rompía la respuesta
      },
      { status: 200 }
    );
  }

  const saved = await upsertClienteByUserId(user.id, body);
  return NextResponse.json(saved, { status: 200 });
}
