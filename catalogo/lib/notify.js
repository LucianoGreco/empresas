// lib/notify.js
// Envío opcional por SMTP. Sin SMTP_URL -> no envía, sólo loguea.
let transporterPromise = null;

async function getTransporter() {
  const url = process.env.SMTP_URL || "";
  if (!url) return null;
  if (!transporterPromise) {
    transporterPromise = import("nodemailer")
      .then((m) => m.default.createTransport(url))
      .catch(() => null);
  }
  return await transporterPromise;
}

/**
 * notify({ type, to, subject, text, html, meta })
 * Si hay SMTP_URL -> envía mail; si no -> console.log y sigue.
 */
export async function notify({ type = "", to = "", subject = "", text = "", html = "", meta = null }) {
  const tx = await getTransporter();
  const from = process.env.NOTIFY_FROM || "no-reply@localhost";

  if (!tx) {
    console.log("[notify:dev-log]", { type, to, subject, text, meta });
    return { ok: false, skipped: true };
  }

  try {
    await tx.sendMail({ from, to, subject, text: text || undefined, html: html || undefined });
    return { ok: true };
  } catch (err) {
    console.error("[notify:error]", err);
    return { ok: false, error: String(err?.message || err) };
  }
}
