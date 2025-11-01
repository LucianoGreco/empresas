// app/api/orders/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { isAdminApi } from "@/lib/admin";

const to2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
const toCents = (n) => Math.round(Number(n || 0) * 100);

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const me = url.searchParams.get("me");
    const emailParam = url.searchParams.get("email");
    const tenantId =
      url.searchParams.get("tenantId") ||
      process.env.DEFAULT_TENANT_ID ||
      "ferreluc";

    let email = "";
    const user = await getUserFromSession();
    const isAdmin = user?.role === "admin";

    if (me) {
      if (!user?.email) {
        return NextResponse.json(
          { error: "No hay sesión de usuario" },
          { status: 401 }
        );
      }
      email = user.email;
    } else if (emailParam) {
      // si vino un email explícito, solo admin puede verlo
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Solo administrador puede consultar por email" },
          { status: 403 }
        );
      }
      email = String(emailParam).trim().toLowerCase();
    } else {
      return NextResponse.json(
        { error: "Especificá ?me=1 o ?email=<correo>" },
        { status: 400 }
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        buyerEmail: email,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        items: true,
        payments: true,
      },
    });

    return NextResponse.json({
      ok: true,
      email,
      count: orders.length,
      orders,
    });
  } catch (e) {
    console.error("[api/orders GET] error", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

// POST igual que el tuyo
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      tenantId = process.env.DEFAULT_TENANT_ID || "ferreluc",
      idempotencyKey,
      buyer = {},
      shipping = {},
      currency = "ARS",
      items = [],
      notes,
    } = body || {};

    if (!buyer?.email || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "buyer.email e items son obligatorios" },
        { status: 400 }
      );
    }

    // Idempotencia (opcional)
    if (idempotencyKey) {
      const existing = await prisma.order.findFirst({
        where: { tenantId, idempotencyKey },
        include: { items: true },
      });
      if (existing) return NextResponse.json(existing);
    }

    // Upsert de Customer
    const customer = await prisma.customer.upsert({
      where: { email: buyer.email },
      update: {
        name: buyer.name ?? undefined,
        phone: buyer.phone ?? undefined,
        dniCuit: buyer.dniCuit ?? undefined,
        tenantId,
      },
      create: {
        email: buyer.email,
        name: buyer.name ?? null,
        phone: buyer.phone ?? null,
        dniCuit: buyer.dniCuit ?? null,
        tenantId,
      },
    });

    const subtotal = to2(
      items.reduce(
        (acc, it) =>
          acc +
          Number(it.unitPrice ?? it.unit_price ?? 0) *
            Number(it.quantity ?? it.qty ?? 1),
        0
      )
    );
    const shipCost = to2(shipping?.cost || 0);
    const discount = 0;
    const tax = to2(subtotal * 0.21); // placeholder
    const total = to2(subtotal + shipCost + tax - discount);

    const code = `FL-${new Date().getFullYear()}-${String(
      Math.floor(Math.random() * 1e6)
    ).padStart(6, "0")}`;

    const order = await prisma.order.create({
      data: {
        tenantId,
        code,
        status: "pending",
        customerId: customer.id,
        buyerEmail: customer.email,
        buyerName: buyer.name ?? null,
        buyerPhone: buyer.phone ?? null,
        buyerDniCuit: buyer.dniCuit ?? null,
        shipStreet: buyer?.address?.street ?? null,
        shipNumber: buyer?.address?.number ?? null,
        shipZip: buyer?.address?.zip ?? null,
        shipCity: buyer?.address?.city ?? null,
        shipState: buyer?.address?.state ?? null,
        shippingMethod: shipping?.method ?? null,
        currency,
        subtotal: toCents(subtotal),
        shipping: toCents(shipCost),
        discount: toCents(discount),
        tax: toCents(tax),
        total: toCents(total),
        notes: notes ?? null,
        idempotencyKey: idempotencyKey ?? null,
        items: {
          create: items.map((it) => ({
            sku: String(it.sku ?? it.id ?? ""),
            title: String(it.title ?? "Producto"),
            brand: it.brand ?? null,
            category: it.category ?? null,
            image: it.image ?? null,
            currency,
            quantity: Math.max(1, Number(it.quantity ?? it.qty ?? 1)),
            unitPrice: toCents(it.unitPrice ?? it.unit_price ?? 0),
            total: toCents(
              (it.unitPrice ?? it.unit_price ?? 0) *
                (it.quantity ?? it.qty ?? 1)
            ),
            meta: it.meta != null ? JSON.stringify(it.meta) : null,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    console.error("[api/orders POST] error", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
