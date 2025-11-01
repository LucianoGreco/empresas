// prisma/seed.mjs

// Carga variables de entorno
import 'dotenv/config';

import fs from 'fs';
import path from 'path';
import { prisma } from "../lib/db.js";

const toCents = (n) => Math.round(Number(n || 0) * 100);

// Asegura que exista la carpeta ./data cuando DATABASE_URL = file:./data/dev.db
function ensureSqliteDir() {
  const url = process.env.DATABASE_URL || "";
  const m = url.match(/^file:\.\/([^?]+)/i);
  if (m && m[1]) {
    const dbPath = m[1].replace(/\//g, path.sep);
    const dir = path.dirname(path.resolve(process.cwd(), dbPath));
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function main() {
  ensureSqliteDir();

  const tenant = process.env.DEFAULT_TENANT_ID || "ferreluc";
  const email = "test@example.com";

  const customer = await prisma.customer.upsert({
    where: { email },
    update: { tenantId: tenant },
    create: {
      email,
      name: "Cliente Demo",
      phone: "2615550000",
      dniCuit: "20-12345678-9",
      tenantId: tenant
    }
  });

  const order = await prisma.order.create({
    data: {
      tenantId: tenant,
      code: `FL-${new Date().getFullYear()}-000001`,
      status: "pending",
      customerId: customer.id,

      buyerEmail: customer.email,
      buyerName: customer.name,
      buyerPhone: customer.phone,
      buyerDniCuit: customer.dniCuit,

      shipStreet: "San Martín",
      shipNumber: "123",
      shipZip: "5500",
      shipCity: "Mendoza",
      shipState: "Mendoza",

      currency: "ARS",
      subtotal: toCents(10000),
      shipping: toCents(0),
      discount: toCents(0),
      tax: toCents(2100),
      total: toCents(12100),
      notes: "Seed order",

      items: {
        create: [{
          sku: "31-92110",
          title: "barra redonda grilon polietileno 10 mm",
          brand: "NTH",
          category: "barra redonda grilon polietileno",
          image: "/imagenes/barra redonda grilon polietileno.png",
          currency: "ARS",
          quantity: 1,
          unitPrice: toCents(12100),
          total: toCents(12100),
          meta: null
        }]
      }
    }
  });

  console.log("Seed OK:", { customer: customer.email, order: order.code });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

/* fin */
