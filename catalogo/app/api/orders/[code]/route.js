// Devuelve una orden por "code" con items, pagos y (opcionalmente) eventos/cliente.
// Uso: GET /api/orders/FL-2025-000123
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req, { params }) {
  try {
    const code = decodeURIComponent(String(params?.code || "")).trim();
    if (!code) {
      return NextResponse.json({ error: "code es requerido" }, { status: 400 });
    }

    // IMPORTANTE: code no es unique global (solo tenantId+code). Usamos findFirst.
    const order = await prisma.order.findFirst({
      where: { code },
      include: {
        items: true,
        payments: true,
        customer: true,
        events: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (e) {
    console.error("[api/orders/[code]] error", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
