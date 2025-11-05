export const dynamic = "force-dynamic";

export default function PendingPage() {
  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1>Pago pendiente</h1>
      <p>Tu pago quedó en revisión o pendiente. Te avisaremos cuando se acredite.</p>
      <a href="/" style={{ color: "#2563eb", textDecoration: "underline" }}>Volver al catálogo</a>
    </div>
  );
}
