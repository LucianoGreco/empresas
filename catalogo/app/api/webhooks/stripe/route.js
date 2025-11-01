// Webhook Stripe: valida firma, persiste evento, actualiza orden/pago con idempotencia
import Stripe from "stripe";
import { prisma } from "@/lib/db";

export async function POST(req) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) return new Response("no sk", { status: 200 });

  const stripe = new Stripe(sk, { apiVersion: "2024-06-20" });

  let event = null;
  let payloadText = await req.text();
  try {
    if (secret) {
      const sig = req.headers.get("stripe-signature") || "";
      event = stripe.webhooks.constructEvent(payloadText, sig, secret);
    } else {
      event = JSON.parse(payloadText);
    }
  } catch (err) {
    return new Response("invalid", { status: 400 });
  }

  const receivedAt = new Date();
  const eventId = event?.id || `stripe:${receivedAt.getTime()}`;
  const type = event?.type || "unknown";

  // Idempotencia webhook
  const exists = await prisma.webhookEvent.findUnique({ where: { eventId } }).catch(() => null);
  if (exists) return new Response("dup", { status: 200 });

  // Guarda evento crudo (como String)
  const evt = await prisma.webhookEvent.create({
    data: {
      provider: "stripe",
      eventId,
      eventType: type,
      signature: null,
      payload: event ? JSON.stringify(event) : null,
      receivedAt,
      processedOk: false,
    },
  });

  try {
    // Interesa principalmente checkout.session.completed y payment_intent.*
    let orderId = null;
    let orderCode = null;
    let amount = 0;
    let currency = "ARS";
    let providerRef = null;
    let status = "pending";

    if (type === "checkout.session.completed") {
      const sess = event.data.object;
      amount = Math.round(Number(sess?.amount_total || 0)); // stripe ya viene en centavos
      currency = String(sess?.currency || "ars").toUpperCase();
      providerRef = String(sess?.payment_intent || sess?.id || "");
      orderId = sess?.metadata?.orderId || null;
      orderCode = sess?.metadata?.orderCode || null;
      status = "approved";
    } else if (type === "payment_intent.succeeded") {
      const pi = event.data.object;
      amount = Math.round(Number(pi?.amount || 0)); // centavos
      currency = String(pi?.currency || "ars").toUpperCase();
      providerRef = String(pi?.id || "");
      orderId = pi?.metadata?.orderId || null;
      orderCode = pi?.metadata?.orderCode || null;
      status = "approved";
    } else if (type === "payment_intent.payment_failed") {
      const pi = event.data.object;
      amount = Math.round(Number(pi?.amount || 0)); // centavos
      currency = String(pi?.currency || "ars").toUpperCase();
      providerRef = String(pi?.id || "");
      orderId = pi?.metadata?.orderId || null;
      orderCode = pi?.metadata?.orderCode || null;
      status = "rejected";
    }

    let orderRow = null;
    if (orderId) {
      orderRow = await prisma.order.findUnique({ where: { id: String(orderId) } });
    }
    if (!orderRow && orderCode) {
      orderRow = await prisma.order.findUnique({ where: { code: String(orderCode) } });
    }

    const payRow = await prisma.payment.upsert({
      where: { eventId },
      update: {
        provider: "stripe",
        providerRef,
        status,
        currency: currency === "USD" ? "USD" : "ARS",
        amount: amount || 0,
        rawPayload: event ? JSON.stringify(event) : null,
        errorMessage: null,
        orderId: orderRow?.id || null,
        tenantId: orderRow?.tenantId || null,
      },
      create: {
        eventId,
        provider: "stripe",
        providerRef,
        status,
        currency: currency === "USD" ? "USD" : "ARS",
        amount: amount || 0,
        rawPayload: event ? JSON.stringify(event) : null,
        errorMessage: null,
        orderId: orderRow?.id || null,
        tenantId: orderRow?.tenantId || null,
      },
    });

    await prisma.webhookEvent.update({
      where: { id: evt.id },
      data: { processedOk: true, paymentId: payRow.id, orderId: orderRow?.id || null, errorMessage: null },
    });

    if (orderRow && status === "approved") {
      await prisma.order.update({
        where: { id: orderRow.id },
        data: { status: "paid", paidAt: new Date() },
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
