// lib/client-profile.js
import { prisma } from "@/lib/db";

const SELECT = {
  id: true,
  userId: true,
  nombreCompleto: true,
  email: true,
  telefono: true,
  documento: true,
  calle: true,
  numero: true,
  piso: true,
  referencia: true,
  codigoPostal: true,
  ciudad: true,
  provincia: true,
  pais: true,
  tipoEnvio: true,
  comentariosEnvio: true,
  metodoPago: true,
  titularTarjeta: true,
  numeroTarjeta: true,
  vencimientoTarjeta: true,
  cvvTarjeta: true,
  direccionFacturacion: true,
  comprobanteTransferencia: true,
  tipoFactura: true,
  razonSocial: true,
  cuit: true,
  direccionFiscal: true,
  aceptaTerminos: true,
  aceptaPromos: true,
  createdAt: true,
  updatedAt: true,
};

export async function getClienteByUserId(userId) {
  return prisma.clientePerfil.findUnique({
    where: { userId },
    select: SELECT,
  });
}

export async function upsertClienteByUserId(userId, data) {
  return prisma.clientePerfil.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
    select: SELECT,
  });
}
