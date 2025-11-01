// D:\empresas\ferreluc\gestion\scripts\cleanup-sessions.mjs
// Limpia sesiones expiradas y hace VACUUM opcional en SQLite.
// Uso: node scripts/cleanup-sessions.mjs [--vacuum]
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const VACUUM = process.argv.includes("--vacuum");

function getSqliteFile() {
  // DATABASE_URL = file:./data/catalogo.db
  const url = process.env.DATABASE_URL || "";
  if (!url.startsWith("file:")) return null;
  const p = url.slice("file:".length);
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}

async function run() {
  const before = await prisma.userSession.count();
  const del = await prisma.userSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  const after = await prisma.userSession.count();

  console.log(`Sesiones antes: ${before}`);
  console.log(`Eliminadas:     ${del.count}`);
  console.log(`Sesiones ahora: ${after}`);

  if (VACUUM) {
    const file = getSqliteFile();
    if (file && fs.existsSync(file)) {
      try {
        await prisma.$executeRawUnsafe("VACUUM");
        console.log("VACUUM ejecutado.");
      } catch (e) {
        console.warn("No se pudo ejecutar VACUUM:", e?.message);
      }
    } else {
      console.log("VACUUM omitido (no es SQLite o no existe el archivo).");
    }
  }
}

run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  