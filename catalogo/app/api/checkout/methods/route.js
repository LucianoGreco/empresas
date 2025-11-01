// D:\empresas\catalogo\app\api\checkout\methods\route.js
export async function GET() {
  const active = [];

  if (process.env.MP_ACCESS_TOKEN) active.push("mercadopago");
  if (process.env.STRIPE_SECRET_KEY) active.push("stripe");

  if (process.env.REDIRECT_TODOPAGO_URL) active.push("todopago");
  if (process.env.REDIRECT_PAYU_URL) active.push("payu");
  if (process.env.REDIRECT_PAGOS360_URL) active.push("pagos360");
  if (process.env.REDIRECT_MOBBEX_URL) active.push("mobbex");
  if (process.env.REDIRECT_QR_URL) active.push("qr");

  return new Response(JSON.stringify(active), {
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
