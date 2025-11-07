import { NextResponse } from "next/server";
import { isAdminApi } from "@/lib/admin";
import { listShipments, createShipment, updateShipment, getShipmentById } from "@/lib/shipments-store";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

// GET /api/shipments?status=pending|shipped|delivered|canceled&order=FL-2025-000123&q=...
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const orderCode = url.searchParams.get("order") || undefined;
    const q = url.searchParams.get("q") || undefined;
    const list = await listShipments({ status, orderCode, q });
    return NextResponse.json(list);
  } catch (e) {
    console.error("[GET /api/shipments]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

// POST /api/shipments
// body: { orderCode, address, eta, tracking, carrier, status="pending", notes }
export async function POST(req) {
  try {
    const ok = await isAdminApi(req); // <<<< antes no pasaba req
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const s = await createShipment(body);

    await notify({
      type: "shipment_created",
      to: s.email || null,
      subject: `Tu envío para ${s.orderCode} fue creado`,
      text: `Estado actual: ${s.status}\nTracking: ${s.tracking || "-"}\nETA: ${s.eta || "-"}`,
      meta: s,
    });

    return NextResponse.json({ ok: true, shipment: s });
  } catch (e) {
    const code = e?.name === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: e?.message || "Server error" }, { status: code });
  }
}

// PATCH /api/shipments  (update por id)
// body: { id, ...fields }
export async function PATCH(req) {
  try {
    const ok = await isAdminApi(req); // <<<< antes no pasaba req
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body?.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const prev = await getShipmentById(body.id);
    if (!prev) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const updated = await updateShipment(body.id, body);

    if (prev.status !== updated.status) {
      await notify({
        type: "shipment_status",
        to: updated.email || null,
        subject: `Actualización de envío ${updated.orderCode}: ${updated.status}`,
        text: `Nuevo estado: ${updated.status}\nTracking: ${updated.tracking || "-"}\nETA: ${updated.eta || "-"}`,
        meta: updated,
      });
    }

    return NextResponse.json({ ok: true, shipment: updated });
  } catch (e) {
    const code = e?.name === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: e?.message || "Server error" }, { status: code });
  }
}
