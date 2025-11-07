import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminApi } from "@/lib/admin";

export const dynamic = "force-dynamic";

// GET /api/payments?status=&method=&order=&q=
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const rawStatus = url.searchParams.get("status") || "";
    const method = url.searchParams.get("method") || undefined;
    const orderCode = url.searchParams.get("order") || undefined;
    const q = url.searchParams.get("q") || undefined;

    // Normalizamos el status: UI antes mandaba "canceled" (no existe en enum)
    const status =
      rawStatus === "canceled" || rawStatus === "cancelled"
        ? "rejected"
        : rawStatus || undefined;

    const where = {
      ...(status ? { status } : {}),
      ...(method ? { provider: method } : {}),
      ...(orderCode ? { order: { code: orderCode } } : {}),
      ...(q
        ? {
            OR: [
              { id: q },
              { providerRef: q },
              { eventId: q },
              { order: { code: q } },
              { order: { buyerEmail: { contains: q } } },
            ],
          }
        : {}),
    };

    const rows = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { order: { select: { code: true, total: true, buyerEmail: true, customerId: true } } },
      take: 500,
    });

    return NextResponse.json(rows);
  } catch (e) {
    console.error("[GET /api/payments]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// POST -> carga manual (transfer/QR) enlazado a una orden
// body: { orderCode, provider="transfer"|..., amount, currency="ARS", status="pending"|"approved"|"rejected"|"refunded", note }
export async function POST(req) {
  try {
    const ok = await isAdminApi(req);
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { orderCode, provider = "transfer", amount, currency = "ARS", status = "pending", note = "" } = body;

    if (!orderCode || !provider || typeof amount !== "number") {
      return NextResponse.json({ error: "orderCode, provider y amount son obligatorios" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({ where: { code: orderCode } });
    if (!order) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

    const eventId = `manual:${provider}:${order.id}:${Date.now()}`;

    const payment = await prisma.payment.create({
      data: {
        eventId,
        provider,
        providerRef: null,
        status: status === "canceled" ? "rejected" : status,
        amount,
        currency,
        rawPayload: note ? JSON.stringify({ note }) : null,
        orderId: order.id,
        tenantId: order.tenantId,
      },
    });

    if (payment.status === "approved") {
      const { _sum } = await prisma.payment.aggregate({
        where: { orderId: order.id, status: "approved" },
        _sum: { amount: true },
      });
      if ((_sum.amount || 0) >= order.total) {
        await prisma.order.update({ where: { id: order.id }, data: { status: "paid", paidAt: new Date() } });
      }
    }

    return NextResponse.json({ ok: true, payment });
  } catch (e) {
    const code = e?.name === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: e?.message || "Server error" }, { status: code });
  }
}
