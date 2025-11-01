// D:\empresas\catalogo\app\api\checkout\providers\redirect.js
const MAP = {
  TODOPAGO: "REDIRECT_TODOPAGO_URL",
  PAYU: "REDIRECT_PAYU_URL",
  PAGOS360: "REDIRECT_PAGOS360_URL",
  MOBBEX: "REDIRECT_MOBBEX_URL",
  QR: "REDIRECT_QR_URL"
};

export function createRedirectCheckout(kind) {
  const key = MAP[kind.toUpperCase()];
  const url = key ? process.env[key] : null;
  if (!url) throw new Error(`URL redirect no configurada para ${kind}`);
  return url;
}
