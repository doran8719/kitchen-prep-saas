// src/lib/feed/feed.ts
// The Prepline order feed: a simple, documented way for any website (a custom
// build, a headless shop, anything) to hand its orders to Prepline.
// Spec for developers: /docs/order-feed (app/docs/order-feed/page.tsx).
//
// Prepline calls:  GET <feed url>?from=YYYY-MM-DD&to=YYYY-MM-DD
//                  Authorization: Bearer <feed key>
// The site answers with { orders: FeedOrder[], products?: FeedProduct[], next?: string }.

import type { OrderLine } from "@/src/lib/prep/types";
import type { StoreProduct } from "@/src/lib/prep/store-menu";

export interface FeedOrderItem {
  productId?: string | number;
  /** Dish or product name, e.g. "Bulgogi Chicken". */
  name: string;
  /** Meal size as the customer picked it, e.g. "Medium 6oz". */
  size?: string;
  quantity: number;
  /** Other choices, e.g. { "Extras": "Extra Protein (+2oz)", "Substitutes": "Sweet potato" }. */
  options?: Record<string, string | number | string[]>;
  /** Customer notes for this item. */
  note?: string;
}

export interface FeedOrder {
  id: string | number;
  /** paid | processing | completed | on-hold count. Anything else (pending, refunded, cancelled…) is skipped. */
  status: string;
  /** When the order was placed, ISO 8601 with the store's local offset, e.g. "2026-10-12T09:41:00-06:00". */
  createdAt: string;
  items: FeedOrderItem[];
}

export interface FeedProduct {
  id: string | number;
  name: string;
  /** e.g. ["Current Menu"]: the category that marks this week's dishes. */
  categories?: string[];
  protein?: string;
  prepType?: string;
  starch?: string;
  sides?: string[];
}

export interface FeedConfig {
  url: string;
  key: string;
}

export class FeedError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export const FEED_COUNTED_STATUSES = ["paid", "processing", "completed", "on-hold", "fulfilled"];

export function feedStatusCounts(status: string) {
  return FEED_COUNTED_STATUSES.includes(String(status).toLowerCase());
}

/** Stable number for a string id, so feed ids fit Prepline's numeric product ids. */
export function numericId(id: string | number | undefined): number | undefined {
  if (id === undefined || id === null || id === "") return undefined;
  if (typeof id === "number" && Number.isFinite(id)) return id;
  const s = String(id);
  if (/^\d{1,15}$/.test(s)) return Number(s);
  let h = 0x811c9dc5; // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return 1_000_000_000_000 + (h >>> 0); // well clear of real numeric ids
}

const MAX_PAGES = 50;

/** Every order (and product) the feed returns for the date range, following `next` pages. */
export async function fetchFeed(cfg: FeedConfig, from: string, to: string) {
  const orders: FeedOrder[] = [];
  const products = new Map<string, FeedProduct>();
  const base = new URL(cfg.url);
  let next: string | null = (() => {
    const u = new URL(cfg.url);
    u.searchParams.set("from", from);
    u.searchParams.set("to", to);
    return u.toString();
  })();

  for (let page = 0; next && page < MAX_PAGES; page++) {
    const res: Response = await fetch(next, {
      headers: { Authorization: `Bearer ${cfg.key}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new FeedError(`The order feed returned ${res.status}.`, res.status);
    let body: { orders?: unknown; products?: unknown; next?: unknown };
    try {
      body = await res.json();
    } catch {
      throw new FeedError("The order feed didn't return JSON.", 502);
    }
    if (!Array.isArray(body.orders)) throw new FeedError('The order feed\'s reply is missing an "orders" list.', 502);
    for (const o of body.orders as FeedOrder[]) {
      if (o && o.id !== undefined && typeof o.createdAt === "string" && Array.isArray(o.items)) orders.push(o);
    }
    if (Array.isArray(body.products)) {
      for (const p of body.products as FeedProduct[]) if (p && p.id !== undefined && p.name) products.set(String(p.id), p);
    }
    // Only follow next-page links on the same site.
    next = null;
    if (typeof body.next === "string" && body.next) {
      const n = new URL(body.next, base);
      if (n.host === base.host) next = n.toString();
    }
  }
  return { orders, products: [...products.values()] };
}

/** The store-local date an order was placed (YYYY-MM-DD), read from its timestamp. */
export const feedOrderDate = (o: FeedOrder) => o.createdAt.slice(0, 10);

export function linesFromFeedOrders(orders: FeedOrder[]): OrderLine[] {
  const lines: OrderLine[] = [];
  for (const o of orders) {
    if (!feedStatusCounts(o.status)) continue;
    for (const it of o.items) {
      if (!it || !it.name) continue;
      const meta: Record<string, string> = {};
      for (const [k, v] of Object.entries(it.options || {})) {
        const val = Array.isArray(v) ? v.join(", ") : String(v ?? "");
        if (k) meta[k.toLowerCase()] = val;
      }
      if (it.size) meta.portions = it.size;
      if (it.note) meta["special requests"] = it.note;
      lines.push({
        orderId: o.id,
        productId: numericId(it.productId),
        itemName: it.size ? `${it.name} - ${it.size}` : it.name,
        qty: Number(it.quantity) || 1,
        meta,
      });
    }
  }
  return lines;
}

export function storeProductsFromFeed(
  products: FeedProduct[],
  attrNames: { protein: string; prep: string; starch: string; sides: string }
): StoreProduct[] {
  return products.map((p) => {
    const attributes: Record<string, string[]> = {};
    if (p.protein) attributes[attrNames.protein] = [p.protein];
    if (p.prepType) attributes[attrNames.prep] = [p.prepType];
    if (p.starch) attributes[attrNames.starch] = [p.starch];
    if (p.sides?.length) attributes[attrNames.sides] = p.sides;
    return { id: numericId(p.id)!, name: p.name, categories: p.categories || [], attributes };
  });
}

/** A feed address must be a public https URL (path allowed, no query). */
export function normalizeFeedUrl(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") u.protocol = "https:";
  const host = u.hostname.toLowerCase();
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
  if (isIp || host === "localhost" || !host.includes(".") || host.endsWith(".local") || host.endsWith(".internal")) {
    return null;
  }
  u.search = "";
  u.hash = "";
  return u.toString();
}
