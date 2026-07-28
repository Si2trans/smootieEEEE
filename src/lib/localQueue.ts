import type { QueueAddon, QueueItem, QueueOrder, QueueStatus } from "../types/app";

const LOCAL_QUEUE_STORAGE_KEY = "drink-cost-studio:local-queues:v1";
const QUEUE_RETENTION_DAYS = 14;

export function getLocalQueueOrders(): QueueOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return pruneQueueHistory(parsed.map(normalizeQueueOrder).filter((queue): queue is QueueOrder => Boolean(queue)));
  } catch {
    return [];
  }
}

export function storeLocalQueueOrders(queues: QueueOrder[]) {
  if (typeof window === "undefined") return;
  const normalized = pruneQueueHistory(queues.map(cloneQueueOrder));
  try {
    window.localStorage.setItem(LOCAL_QUEUE_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    throw new Error("พื้นที่จัดเก็บคิวในเครื่องเต็ม กรุณาล้างคิวเก่าหรือพื้นที่เว็บไซต์");
  }
}

function normalizeQueueOrder(value: unknown): QueueOrder | null {
  if (!value || typeof value !== "object") return null;
  const queue = value as Partial<QueueOrder>;
  const id = safeText(queue.id, 80);
  const queueNumber = safeText(queue.queueNumber, 40);
  const createdAt = safeDate(queue.createdAt);
  if (!id || !queueNumber || !createdAt || !Array.isArray(queue.items)) return null;
  return {
    id,
    queueNumber,
    customerName: safeText(queue.customerName, 80) || undefined,
    status: queueStatus(queue.status),
    note: safeText(queue.note, 500) || undefined,
    createdAt,
    updatedAt: safeDate(queue.updatedAt) || createdAt,
    servedAt: safeDate(queue.servedAt) || undefined,
    items: queue.items
      .map((item) => normalizeQueueItem(item, id))
      .filter((item): item is QueueItem => Boolean(item))
  };
}

function normalizeQueueItem(value: unknown, queueId: string): QueueItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<QueueItem>;
  const id = safeText(item.id, 100);
  const recipeId = safeText(item.recipeId, 100);
  const name = safeText(item.name, 100);
  if (!id || !recipeId || !name) return null;
  return {
    id,
    queueId,
    recipeId,
    name,
    qty: Math.max(1, Math.min(99, Math.floor(Number(item.qty) || 1))),
    unitPrice: safePrice(item.unitPrice),
    note: safeText(item.note, 300) || undefined,
    addons: Array.isArray(item.addons)
      ? item.addons.map(normalizeAddon).filter((addon): addon is QueueAddon => Boolean(addon))
      : []
  };
}

function normalizeAddon(value: unknown): QueueAddon | null {
  if (!value || typeof value !== "object") return null;
  const addon = value as Partial<QueueAddon>;
  const id = safeText(addon.id, 100);
  const name = safeText(addon.name, 80);
  if (!id || !name) return null;
  return {
    id,
    ingredientId: safeText(addon.ingredientId, 100) || undefined,
    name,
    unitPrice: safePrice(addon.unitPrice)
  };
}

function pruneQueueHistory(queues: QueueOrder[]) {
  const cutoff = Date.now() - QUEUE_RETENTION_DAYS * 86400000;
  return queues
    .filter((queue) => {
      if (!["served", "cancelled"].includes(queue.status)) return true;
      const completedAt = new Date(queue.servedAt || queue.updatedAt).getTime();
      return !Number.isFinite(completedAt) || completedAt >= cutoff;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function cloneQueueOrder(queue: QueueOrder): QueueOrder {
  return {
    ...queue,
    items: queue.items.map((item) => ({
      ...item,
      addons: item.addons.map((addon) => ({ ...addon }))
    }))
  };
}

function queueStatus(value: unknown): QueueStatus {
  if (String(value) === "ready") return "preparing";
  return ["waiting", "preparing", "served", "cancelled"].includes(String(value))
    ? value as QueueStatus
    : "waiting";
}

function safeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeDate(value: unknown) {
  if (typeof value !== "string") return "";
  return Number.isFinite(new Date(value).getTime()) ? value : "";
}

function safePrice(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const price = Number(value);
  return Number.isFinite(price) ? Math.max(0, price) : undefined;
}
