// lib/db.js
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

/**
 * Asegura que el archivo/carpeta de SQLite exista cuando DATABASE_URL usa "file:..."
 * Soporta:
 *  - file:./prisma/data/dev.db
 *  - file:prisma/data/dev.db
 *  - file:/D:/empresas/catalogo/prisma/data/dev.db
 *  - file:D:/empresas/catalogo/prisma/data/dev.db
 *  - file:D:\empresas\catalogo\prisma\data\dev.db
 */
function ensureSqliteTarget() {
  const url = process.env.DATABASE_URL || "";
  if (!/^file:/i.test(url)) return;

  // Quitar el prefijo "file:" y querystring si existiera
  let p = url.replace(/^file:/i, "");
  const qsIdx = p.indexOf("?");
  if (qsIdx !== -1) p = p.slice(0, qsIdx);

  // Normalizar separadores
  p = p.replace(/\\/g, "/");

  let abs = p;

  // Casos:
  // 1) "/D:/..." → "D:/..."
  if (/^\/[A-Za-z]:\//.test(abs)) {
    abs = abs.slice(1);
  }

  // 4) Relativos: "./..." | "../..." | "prisma/data/dev.db"
  const isDriveAbs = /^[A-Za-z]:\//.test(abs);
  const isPosixAbs = abs.startsWith("/");
  const isRelative =
    abs.startsWith("./") || abs.startsWith("../") || (!isDriveAbs && !isPosixAbs);

  if (isRelative) {
    abs = path.resolve(process.cwd(), abs);
  }

  // --- LOG de depuración pedido ---
  console.log("[db] SQLite at:", abs);

  const dir = path.dirname(abs);
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch {
    // Si no puede crear la carpeta, Prisma mostrará el motivo real luego.
  }

  // Crear archivo vacío si no existe (evita "unable to open database file")
  try {
    if (!fs.existsSync(abs)) {
      fs.writeFileSync(abs, "");
    }
  } catch {
    // Ignorar: Prisma informará el error si no puede abrir/crear.
  }
}

ensureSqliteTarget();

const g = globalThis;

// Aseguramos Node.js runtime (Prisma no soporta Edge)
if (typeof process !== "undefined" && process.env.NEXT_RUNTIME === "edge") {
  throw new Error("Prisma requiere runtime 'node'. Ajusta la ruta para usar node runtime.");
}

export const prisma =
  g.__prisma__ ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
  });

if (process.env.NODE_ENV !== "production") g.__prisma__ = prisma;

/* fin */
