// D:\empresas\catalogo\app\api\checkout\providers\mercadopago.js
import { MercadoPagoConfig, Preference } from "mercadopago";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function createMPPreference(items, buyer = {}, meta = {}) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MP_ACCESS_TOKEN missing");

  const client = new MercadoPagoConfig({
    accessToken,
    options: { integratorId: process.env.MP_INTEGRATOR_ID || undefined },
  });

  const preferenceApi = new Preference(client);

  const mpItems = (items || []).map((it) => ({
    title: String(it.title || "Producto"),
    quantity: Number(it.quantity || 1),
    currency_id: String(it.currency || "ARS").toUpperCase(),
    unit_price: Number(it.unit_price || 0),
    picture_url: it.image || undefined,
  }));

  const body = {
    items: mpItems,
    payer: buyer?.email ? { email: buyer.email, name: buyer.name || undefined } : undefined,
    back_urls: {
      success: `${SITE_URL}/checkout/success`,
      pending: `${SITE_URL}/checkout/success`,
      failure: `${SITE_URL}/checkout/cancel`,
    },
    ...(SITE_URL.startsWith("https://") ? { auto_return: "approved" } : {}),
    notification_url:
      process.env.MP_NOTIFICATION_URL || `${SITE_URL}/api/webhooks/mercadopago`,
    statement_descriptor: "FERRELUC",
    metadata: { source: "catalogo", ...meta },
  };

  try {
    const pref = await preferenceApi.create({ body });
    const init = pref?.init_point || pref?.sandbox_init_point || pref?.response?.init_point;
    if (!init) throw new Error("No init_point");
    return init;
  } catch (e) {
    const msg =
      e?.message ||
      e?.error?.message ||
      (Array.isArray(e?.error?.cause) && e.error.cause.map(c => c.description).join("; ")) ||
      "MercadoPago error";
    throw new Error(msg);
  }
}
