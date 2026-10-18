// src/lib/woo/client.ts
// SERVER ONLY. Reads orders and products from a WooCommerce store with a
// read-only REST API key. Never import this from a "use client" file: the key
// lives in environment variables that must not reach the browser.

import type { WooOrder } from "@/src/lib/prep/input";
import type { StoreProduct } from "@/src/lib/prep/store-menu";

export interface WooConfig {
  url: string; // https://eathungryhouse.com
  key: string; // ck_...
  secret: string; // cs_...
}

export function wooConfigFromEnv(): WooConfig | null {
  const url = process.env.WOO_STORE_URL?.replace(/\/+$/, "");
  const key = process.env.WOO_CONSUMER_KEY;
  const secret = process.env.WOO_CONSUMER_SECRET;
  if (!url || !key || !secret) return null;
  return { url, key, secret };
}

export class WooError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function wooGet<T>(cfg: WooConfig, path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  const url = `${cfg.url}/wp-json/wc/v3/${path}?${qs}`;
  const auth = "Basic " + Buffer.from(`${cfg.key}:${cfg.secret}`).toString("base64");

  let res = await fetch(url, { headers: { Authorization: auth }, cache: "no-store" });

  // Some hosts strip the Authorization header. WooCommerce's documented
  // fallback over HTTPS is the key in the query string.
  if (res.status === 401) {
    qs.set("consumer_key", cfg.key);
    qs.set("consumer_secret", cfg.secret);
    res = await fetch(`${cfg.url}/wp-json/wc/v3/${path}?${qs}`, { cache: "no-store" });
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.message || "";
    } catch {}
    throw new WooError(`Store returned ${res.status}${detail ? `: ${detail}` : ""}`, res.status);
  }
  const totalPages = Number(res.headers.get("x-wp-totalpages") || "1");
  return { data: (await res.json()) as T, totalPages };
}

function nextDay(ymd: string) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * All orders created from `from` through `to` (inclusive, YYYY-MM-DD, in the
 * store's own timezone). Only order ids, status, date and line items are
 * requested; no customer details.
 */
export async function fetchOrdersBetween(cfg: WooConfig, from: string, to: string): Promise<WooOrder[]> {
  const orders: WooOrder[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, totalPages } = await wooGet<WooOrder[]>(cfg, "orders", {
      after: `${from}T00:00:00`,
      before: `${nextDay(to)}T00:00:00`,
      status: "any",
      per_page: "100",
      page: String(page),
      orderby: "date",
      order: "asc",
      _fields: "id,status,date_created,line_items",
    });
    orders.push(...data);
    if (page >= totalPages) break;
  }
  return orders;
}

interface WooProduct {
  id: number;
  name: string;
  categories: { id: number; name: string }[];
  attributes: { name: string; options: string[] }[];
}

function toStoreProduct(p: WooProduct): StoreProduct {
  return {
    id: p.id,
    name: p.name,
    categories: p.categories.map((c) => c.name),
    attributes: Object.fromEntries(p.attributes.map((a) => [a.name, a.options])),
  };
}

const PRODUCT_FIELDS = "id,name,categories,attributes";

/** Products that were ordered, plus everything in the menu category. */
export async function fetchProducts(cfg: WooConfig, orderedIds: number[], menuCategory: string): Promise<StoreProduct[]> {
  const byId = new Map<number, WooProduct>();

  const { data: cats } = await wooGet<{ id: number; name: string }[]>(cfg, "products/categories", {
    search: menuCategory,
    per_page: "100",
  });
  const cat = cats.find((c) => c.name.toLowerCase() === menuCategory.toLowerCase());
  if (cat) {
    const { data } = await wooGet<WooProduct[]>(cfg, "products", {
      category: String(cat.id),
      per_page: "100",
      _fields: PRODUCT_FIELDS,
    });
    for (const p of data) byId.set(p.id, p);
  }

  const missing = [...new Set(orderedIds)].filter((id) => id && !byId.has(id));
  for (let i = 0; i < missing.length; i += 100) {
    const { data } = await wooGet<WooProduct[]>(cfg, "products", {
      include: missing.slice(i, i + 100).join(","),
      per_page: "100",
      status: "any",
      _fields: PRODUCT_FIELDS,
    });
    for (const p of data) byId.set(p.id, p);
  }

  return [...byId.values()].map(toStoreProduct);
}

/**
 * Cleans up a store address the way people paste it ("eathungryhouse.com/shop/")
 * and refuses anything that isn't a public https site.
 */
export function normalizeStoreUrl(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol === "http:") u.protocol = "https:";
  const host = u.hostname.toLowerCase();
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
  if (isIp || host === "localhost" || !host.includes(".") || host.endsWith(".local") || host.endsWith(".internal")) {
    return null;
  }
  return `https://${u.host}`;
}

/** Checks the key can read orders. Throws WooError with the store's reply if not. */
export async function testConnection(cfg: WooConfig): Promise<void> {
  await wooGet<unknown[]>(cfg, "orders", { per_page: "1", _fields: "id" });
}
