// lib/shipments-store.js
import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "uploads", "shipments.json");

function ensureFile() {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "[]", "utf-8");
}

function readAll() {
  ensureFile();
  try { return JSON.parse(fs.readFileSync(FILE, "utf-8")); } catch { return []; }
}

function writeAll(rows) {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(rows, null, 2), "utf-8");
}

export async function listShipments({ status, orderCode, q } = {}) {
  const all = readAll();
  return all
    .filter(s => (status ? s.status === status : true))
    .filter(s => (orderCode ? s.orderCode === orderCode : true))
    .filter(s => (q ? JSON.stringify(s).toLowerCase().includes(q.toLowerCase()) : true))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 1000);
}

let nextIdCache = 1;
function nextId(rows) {
  nextIdCache = Math.max(nextIdCache, ...rows.map(r => Number(r.id) || 0)) + 1;
  return String(nextIdCache);
}

export async function createShipment(data) {
  const required = ["orderCode", "address"];
  for (const k of required) if (!data?.[k]) throw new Error(`Campo obligatorio: ${k}`);

  const rows = readAll();
  const row = {
    id: nextId(rows),
    orderCode: String(data.orderCode),
    address: String(data.address),
    status: String(data.status || "pending"),
    tracking: data.tracking ? String(data.tracking) : null,
    carrier: data.carrier ? String(data.carrier) : null,
    eta: data.eta ? String(data.eta) : null, // ISO date o texto
    email: data.email ? String(data.email) : null,
    phone: data.phone ? String(data.phone) : null,
    notes: data.notes ? String(data.notes) : "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  rows.push(row);
  writeAll(rows);
  return row;
}

export async function updateShipment(id, patch) {
  const rows = readAll();
  const i = rows.findIndex(r => r.id === String(id));
  if (i === -1) throw new Error("No encontrado");
  const prev = rows[i];
  const allowed = new Set(["address","status","tracking","carrier","eta","email","phone","notes"]);
  const next = { ...prev };
  for (const [k, v] of Object.entries(patch || {})) {
    if (!allowed.has(k)) continue;
    next[k] = v == null ? null : String(v);
  }
  next.updatedAt = new Date().toISOString();
  rows[i] = next;
  writeAll(rows);
  return next;
}

export async function getShipmentById(id) {
  const rows = readAll();
  return rows.find(r => r.id === String(id)) || null;
}
