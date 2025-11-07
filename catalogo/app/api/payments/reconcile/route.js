// GET /api/payments/reconcile?payment_id=...&collection_id=...
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MP_API = "https://api.mercadopago.com/v1/payments/";
const PROVIDER = "mercadopago";

function mapStatus(mp) {
  const s = String(mp?.status || "").toLowerCase();
  if (s === "approved") return { pay: "approved", order: "paid" };
  if (s === "pending" || s === "in_process" || s === "in_mediation") return { pay: "pending", order: "pending" };
  if (s === "rejected" || s === "cancelled") return { pay: "rejected", order: "pending" };
  if (s === "refunded" || s === "charged_back") return { pay: "refunded", order: "pending" };
  return { pay: "error", order: "pending" };
}

async function fetchPayment(mpId) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("MP_ACCESS_TOKEN missing");
  const res = await fetch(`${MP_API}${encodeURIComponent(mpId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`MP fetch ${res.status}: ${json?.message || ""}`);
  return json;
}

async function recalcOrder(orderId) {
  if (!orderId) return;
  const { _sum } = await prisma.payment.aggregate({
    where: { orderId, status: "approved" },
    _sum: { amount: true },
  });
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  if ((_sum.amount || 0) >= (order.total || 0) && order.status !== "paid") {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "paid", paidAt: order.paidAt || new Date() },
    });
  }
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const mpId = url.searchParams.get("payment_id") || url.searchParams.get("collection_id");
    if (!mpId) return NextResponse.json({ error: "payment_id/collection_id requerido" }, { status: 400 });

    const mpPayment = await fetchPayment(mpId);
    const { pay } = mapStatus(mpPayment);
    const amount = Math.round(Number(mpPayment?.transaction_amount || 0) * 100);
    const currency = String(mpPayment?.currency_id || "ARS").toUpperCase();
    const meta = mpPayment?.metadata || {};
    const externalRef = mpPayment?.external_reference || null;

    let orderRow = null;
    if (meta.orderId) {
      orderRow = await prisma.order.findUnique({ where: { id: String(meta.orderId) } });
    }
    if (!orderRow && meta.orderCode) {
      orderRow = await prisma.order.findFirst({ where: { code: String(meta.orderCode) } });
    }
    if (!orderRow && externalRef) {
      orderRow = await prisma.order.findFirst({ where: { code: String(externalRef) } }).catch(() => null);
    }

    const eventId = `mp:reconcile:${mpId}`;

    const payment = await prisma.payment.upsert({
      where: { eventId },
      update: {
        provider: PROVIDER,
        providerRef: String(mpPayment?.id || ""),
        status: pay,
        currency: currency === "USD" ? "USD" : "ARS",
        amount: amount || 0,
        rawPayload: JSON.stringify(mpPayment),
        errorMessage: null,
        orderId: orderRow?.id || null,
        tenantId: orderRow?.tenantId || null,
      },
      create: {
        eventId,
        provider: PROVIDER,
        providerRef: String(mpPayment?.id || ""),
        status: pay,
        currency: currency === "USD" ? "USD" : "ARS",
        amount: amount || 0,
        rawPayload: JSON.stringify(mpPayment),
        errorMessage: null,
        orderId: orderRow?.id || null,
        tenantId: orderRow?.tenantId || null,
      },
    });

    if (orderRow) await recalcOrder(orderRow.id);

    return NextResponse.json({ ok: true, payment, orderCode: orderRow?.code || null });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
