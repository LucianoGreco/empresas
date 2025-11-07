// app/api/admin/overview/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminApi } from "@/lib/admin";

export async function GET(req) {
  const ok = await isAdminApi(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Totales y últimos eventos/pagos para “pulso” rápido
  const [orders, payments, users, pendingOrders, lastPayments] = await Promise.all([
    prisma.order.count(),
    prisma.payment.count(),
    prisma.user.count(),
    prisma.order.count({ where: { status: "pending" } }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        createdAt: true,
        status: true,
        provider: true,
        amount: true,
        currency: true,
        order: { select: { code: true, buyerEmail: true, total: true } },
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    totals: { orders, payments, users, pendingOrders },
    lastPayments,
  }, { headers: { "Cache-Control": "no-store" } });
}
