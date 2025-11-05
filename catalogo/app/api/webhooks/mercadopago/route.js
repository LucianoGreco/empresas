// Webhook Mercado Pago: persiste evento, consulta pago, firma opcional v2, idempotencia y actualización de orden
// D:\empresas\catalogo\app\api\webhooks\mercadopago\route.js
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notify";

const MP_API = "https://api.mercadopago.com/v1/payments/";
const PROVIDER = "mercadopago";

/** Lee body crudo + intenta parsear JSON */
async function readBody(req) {
  const raw = await req.text();
  let json = null;
  try { json = JSON.parse(raw); } catch {}
  return { raw, json };
}

/** Mapea status MP -> (Payment.status, Order.status proposición) */
function mapStatus(mp) {
  const s = String(mp?.status || "").toLowerCase();
  if (s === "approved") return { pay: "approved", order: "paid" };
  if (s === "pending" || s === "in_process" || s === "in_mediation") return { pay: "pending", order: "pending" };
  if (s === "rejected" || s === "cancelled") return { pay: "rejected", order: "pending" };
  if (s === "refunded" || s === "charged_back") return { pay: "refunded", order: "pending" };
  return { pay: "error", order: "pending" };
}

/** Fetch pago en MP */
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

/** Valida firma v2 si se configuró MP_WEBHOOK_SECRET. 
 *  Formato header: x-signature: ts=1699999999,v1=HEX
 *  Mensaje canónico: id:{dataId};request-id:{x-request-id};ts:{ts}
 */
function validateSignatureV2({ header, ts, v1, dataId, requestId }) {
  const secret = process.env.MP_WEBHOOK_SECRET || "";
  if (!secret) return { ok: true, reason: "no-secret" };
  if (!header || !ts || !v1 || !dataId || !requestId) return { ok: false, reason: "missing-parts" };

  const canonical = `id:${dataId};request-id:${requestId};ts:${ts}`;
  const hmac = crypto.createHmac("sha256", secret).update(canonical).digest("hex");
  const ok = crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(String(v1).toLowerCase()));
  return { ok, reason: ok ? "match" : "mismatch" };
}

/** Marca paid si suma de aprobados >= total */
async function updateOrderPaymentState(order) {
  if (!order) return;
  const { _sum } = await prisma.payment.aggregate({
    where: { orderId: order.id, status: "approved" },
    _sum: { amount: true },
  });
  const approved = _sum.amount || 0;
  const shouldBePaid = approved >= (order.total || 0);
  if (shouldBePaid && order.status !== "paid") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "paid", paidAt: order.paidAt || new Date(), updatedAt: new Date() },
    });
  }
}

export async function POST(req) {
  const receivedAt = new Date();

  // Headers
  const sigHeader = req.headers.get("x-signature") || "";
  const requestId = req.headers.get("x-request-id") || "";

  // Query (MP manda info en query y/o body)
  const url = new URL(req.url);
  const typeQ = url.searchParams.get("type") || url.searchParams.get("topic") || null;
  const dataIdQ = url.searchParams.get("data.id") || null;

  // Body crudo + json
  const { raw, json: body } = await readBody(req);
  const action = body?.action || null;
  const dataIdB = body?.data?.id || body?.id || null;

  const mpId = dataIdB || dataIdQ || null;
  const eventType = action || typeQ || "unknown";
  const eventId = requestId || `${eventType}:${mpId || "na"}:${receivedAt.getTime()}`;

  // Firma v2 (opcional, si hay secret set y header con ts/v1)
  const parts = Object.fromEntries(String(sigHeader).split(",").map(s => s.trim().split("=").map((x,i)=> i?x:x)));
  // parts.ts = "...", parts.v1 = "hex"
  if (process.env.MP_WEBHOOK_SECRET) {
    const { ok } = validateSignatureV2({ header: sigHeader, ts: parts.ts, v1: parts.v1, dataId: mpId, requestId });
    if (!ok) return new Response("invalid-signature", { status: 400 });
  }

  // Idempotencia por eventId
  const already = await prisma.webhookEvent.findUnique({ where: { eventId } }).catch(() => null);
  if (already) return new Response("dup", { status: 200 });

  // Persistimos el evento crudo
  const evt = await prisma.webhookEvent.create({
    data: {
      provider: PROVIDER,
      eventId,
      eventType,
      signature: sigHeader || null,
      payload: raw || null,
      receivedAt,
      processedOk: false,
    },
  });

  try {
    if (!mpId) {
      await prisma.webhookEvent.update({ where: { id: evt.id }, data: { errorMessage: "no mpId", processedOk: false } });
      return new Response("ok", { status: 200 });
    }

    // Consulta pago en MP (fuente de verdad)
    const mpPayment = await fetchPayment(mpId);

    // Datos importantes
    const meta = mpPayment?.metadata || {};
    const amount = Math.round(Number(mpPayment?.transaction_amount || 0) * 100); // a centavos
    const currency = String(mpPayment?.currency_id || "ARS").toUpperCase();
    const { pay } = mapStatus(mpPayment);

    // Buscar orden por metadata
    let orderRow = null;
    if (meta.orderId) orderRow = await prisma.order.findUnique({ where: { id: String(meta.orderId) } });
    if (!orderRow && meta.orderCode) orderRow = await prisma.order.findUnique({ where: { code: String(meta.orderCode) } });

    // Upsert Payment por eventId (idempotente)
    const payRow = await prisma.payment.upsert({
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

    // Vínculo desde el evento
    await prisma.webhookEvent.update({
      where: { id: evt.id },
      data: { paymentId: payRow.id, orderId: orderRow?.id || null, processedOk: true, errorMessage: null },
    });

    // Recalcular estado de orden por suma
    if (orderRow) await updateOrderPaymentState(orderRow);

    // Notificar si aprobado (usamos email de la orden)
    if (payRow.status === "approved" && orderRow?.buyerEmail) {
      await notify({
        type: "payment_approved",
        to: orderRow.buyerEmail,
        subject: `Pago aprobado (${PROVIDER}) - Orden ${orderRow.code}`,
        text: `Tu pago fue aprobado.\nOrden: ${orderRow.code}\nImporte: ${(payRow.amount / 100).toFixed(2)} ${payRow.currency}\nRef: ${payRow.providerRef}`,
        meta: { provider: PROVIDER, paymentId: payRow.id, orderId: orderRow.id },
      });
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    await prisma.webhookEvent.update({
      where: { id: evt.id },
      data: { processedOk: false, errorMessage: String(err?.message || err) },
    });
    return new Response("ok", { status: 200 });
  }
}

export const GET = async () => new Response("ok");
