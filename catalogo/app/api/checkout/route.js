// D:\empresas\catalogo\app\api\checkout\route.js
export const runtime = "nodejs"; // Stripe/MP requieren Node

import { NextResponse } from "next/server";
import { createMPPreference } from "./providers/mercadopago";
import { createStripeSession } from "./providers/stripe";
import { createRedirectCheckout } from "./providers/redirect";

export async function POST(req) {
  try {
    const body = await req.json();
    const provider = String(body?.provider || "").toLowerCase();
    const buyer = body?.buyer || {};
    const items = Array.isArray(body?.items) ? body.items : [];
    const meta = body?.meta || {};

    if (!items.length) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }

    switch (provider) {
      case "mercadopago": {
        const url = await createMPPreference(items, buyer, meta);
        return NextResponse.json({ url });
      }
      case "stripe": {
        const url = await createStripeSession(items, buyer, meta);
        return NextResponse.json({ url });
      }
      case "todopago":
        return NextResponse.json({ url: createRedirectCheckout("TODOPAGO") });
      case "payu":
        return NextResponse.json({ url: createRedirectCheckout("PAYU") });
      case "pagos360":
        return NextResponse.json({ url: createRedirectCheckout("PAGOS360") });
      case "mobbex":
        return NextResponse.json({ url: createRedirectCheckout("MOBBEX") });
      case "qr":
        return NextResponse.json({ url: createRedirectCheckout("QR") });
      default: {
        if (process.env.MP_ACCESS_TOKEN) {
          const url = await createMPPreference(items, buyer, meta);
          return NextResponse.json({ url });
        }
        return NextResponse.json({ error: "Proveedor no soportado" }, { status: 400 });
      }
    }
  } catch (e) {
    console.error("[/api/checkout] error:", e);
    const msg = e?.message || "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* fin */
