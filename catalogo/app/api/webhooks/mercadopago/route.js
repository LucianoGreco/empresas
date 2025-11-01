// Webhook Mercado Pago: persiste evento, consulta pago, actualiza orden/pago con idempotencia
import { prisma } from "@/lib/db";

const MP_API = "https://api.mercadopago.com/v1/payments/";
const PROVIDER = "mercadopago";

async function getJsonSafe(req) {
  try {
    const txt = await req.text();
    try { return JSON.parse(txt); } catch { return { raw: txt }; }
  } catch { return {}; }
}

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
  if (!res.ok) throw new Error(`MP fetch ${res.status}`);
  return res.json();
}

export async function POST(req) {
  const receivedAt = new Date();
  const signature = req.headers.get("x-signature") || null;
  const requestId = req.headers.get("x-request-id") || null;

  // MP manda info en query y/o body. Soportamos ambos.
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || url.searchParams.get("topic") || null;
  const dataIdQ = url.searchParams.get("data.id") || null;

  const body = await getJsonSafe(req);
  const action = body?.action || null;
  const dataIdB = body?.data?.id || body?.id || null;

  const mpId = dataIdB || dataIdQ || null;
  const eventType = action || type || "unknown";
  const eventId = requestId || `${eventType}:${mpId || "na"}:${receivedAt.getTime()}`;

  // Idempotencia de evento de webhook
  const already = await prisma.webhookEvent.findUnique({ where: { eventId } }).catch(() => null);
  if (already) return new Response("dup", { status: 200 });

  // Guarda evento crudo (payload String)
  const evt = await prisma.webhookEvent.create({
    data: {
      provider: PROVIDER,
      eventId,
      eventType,
      signature,
      payload: body ? JSON.stringify(body) : null,
      receivedAt,
      processedOk: false,
    },
  });

  try {
    if (!mpId) {
      await prisma.webhookEvent.update({ where: { id: evt.id }, data: { errorMessage: "no mpId", processedOk: false } });
      return new Response("ok", { status: 200 });
    }

    // Consulta pago en MP
    const mpPayment = await fetchPayment(mpId);

    // Datos útiles
    const meta = mpPayment?.metadata || {};
    const amount = Math.round(Number(mpPayment?.transaction_amount || 0) * 100); // a centavos
    const currency = String(mpPayment?.currency_id || "ARS").toUpperCase();
    const { pay, order } = mapStatus(mpPayment);

    // Ubicar orden por metadata (orderId o orderCode)
    let orderRow = null;
    if (meta.orderId) {
      orderRow = await prisma.order.findUnique({ where: { id: String(meta.orderId) } });
    }
    if (!orderRow && meta.orderCode) {
      orderRow = await prisma.order.findUnique({ where: { code: String(meta.orderCode) } });
    }

    // Crear/actualizar Payment por eventId
    const payRow = await prisma.payment.upsert({
      where: { eventId }, // idempotencia x evento
      update: {
        provider: "mercadopago",
        providerRef: String(mpPayment?.id || ""),
        status: pay,
        currency: currency === "USD" ? "USD" : "ARS",
        amount: amount || 0,
        rawPayload: mpPayment ? JSON.stringify(mpPayment) : null,
        errorMessage: null,
        orderId: orderRow?.id || null,
        tenantId: orderRow?.tenantId || null,
      },
      create: {
        eventId,
        provider: "mercadopago",
        providerRef: String(mpPayment?.id || ""),
        status: pay,
        currency: currency === "USD" ? "USD" : "ARS",
        amount: amount || 0,
        rawPayload: mpPayment ? JSON.stringify(mpPayment) : null,
        errorMessage: null,
        orderId: orderRow?.id || null,
        tenantId: orderRow?.tenantId || null,
      },
    });

    // Actualizar relación desde evento
    await prisma.webhookEvent.update({
      where: { id: evt.id },
      data: {
        paymentId: payRow.id,
        orderId: orderRow?.id || null,
        processedOk: true,
        errorMessage: null,
      },
    });

    // Actualizar orden si existe
    if (orderRow) {
      const update = {
        status: order === "paid" ? "paid" : orderRow.status,
        paidAt: order === "paid" ? new Date() : orderRow.paidAt,
        updatedAt: new Date(),
      };
      await prisma.order.update({ where: { id: orderRow.id }, data: update });
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    await prisma.webhookEvent.update({
      where: { id: evt.id },
      data: { processedOk: false, errorMessage: String(err?.message || err) },
    });
    return new Response("ok", { status: 200 }); // devolvemos 200 para evitar reintentos violentos
  }
}

export const GET = async () => new Response("ok");
