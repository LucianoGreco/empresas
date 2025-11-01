import Stripe from "stripe";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function createStripeSession(items, buyer = {}, meta = {}) {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) throw new Error("STRIPE_SECRET_KEY missing");
  const stripe = new Stripe(sk, { apiVersion: "2024-06-20" });

  const mode = "payment";
  const currency = (process.env.STRIPE_CURRENCY || "ARS").toLowerCase();

  const line_items = items.map((it) => ({
    quantity: Number(it.quantity || 1),
    price_data: {
      currency,
      product_data: { name: String(it.title || "Producto"), images: it.image ? [it.image] : [] },
      unit_amount: Math.round(Number(it.unit_price || 0) * 100)
    }
  }));

  const orderCodeQuery = meta?.orderCode ? `?order=${encodeURIComponent(meta.orderCode)}` : "";

  const session = await stripe.checkout.sessions.create({
    mode,
    customer_email: buyer?.email || undefined,
    line_items,
    success_url: process.env.STRIPE_SUCCESS_URL || `${SITE_URL}/checkout/success${orderCodeQuery}`,
    cancel_url: process.env.STRIPE_CANCEL_URL || `${SITE_URL}/checkout/cancel`,
    metadata: { source: "catalogo", ...meta }
  });

  if (!session?.url) throw new Error("No session url");
  return session.url;
}
