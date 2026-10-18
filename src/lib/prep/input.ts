// src/lib/prep/input.ts
// Turns the two input sources into the same OrderLine[] shape:
//   - a CSV from the Advanced Order Export plugin (summary or one row per item)
//   - orders from the WooCommerce REST API

import type { InputMode, OrderLine } from "./types";

// ---------------------------------------------------------------- text helpers

export function decode(s: string): string {
  return (s || "")
    .replace(/<[^>]*>/g, "") // strip HTML (Extras values contain price markup)
    .replace(/&amp;/g, "&")
    .replace(/&#0?36;/g, "$")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, "’")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** "Greek Chicken (GF/DF)" -> "greek chicken" */
export function normalizeName(s: string): string {
  return decode(s)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** "Portions: Medium 6oz | Special Requests: x" -> { portions: "Medium 6oz", "special requests": "x" } */
export function parseMeta(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of decode(s).split("|")) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = val;
  }
  return out;
}

// ---------------------------------------------------------------- CSV

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      row.push(cur);
      cur = "";
    } else if ((c === "\n" || c === "\r") && !inQuotes) {
      if (cur !== "" || row.length) {
        row.push(cur);
        rows.push(row.map((v) => v.trim()));
        row = [];
        cur = "";
      }
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else {
      cur += c;
    }
  }
  if (cur !== "" || row.length) {
    row.push(cur);
    rows.push(row.map((v) => v.trim()));
  }
  return rows.filter((r) => r.some((cell) => cell !== ""));
}

const HEADER_ALIASES = {
  item: ["itemname", "productname", "item", "name"],
  qty: ["summaryreporttotalquantity", "totalquantity", "quantity", "qty", "itemquantity"],
  meta: ["productvariation", "orderitemmetadata", "itemmeta", "meta"],
  portion: ["portionsize", "portions", "portion"],
  extras: ["extras"],
  order: ["orderid", "ordernumber", "order"],
  product: ["productid"],
};

function findHeader(headers: string[], aliases: string[]) {
  for (const a of aliases) {
    const i = headers.indexOf(a);
    if (i !== -1) return i;
  }
  return -1;
}

export interface CsvInput {
  lines: OrderLine[];
  mode: InputMode;
  error?: string;
}

export function linesFromCSV(text: string): CsvInput {
  const rows = parseCSV(text);
  if (rows.length < 2) return { lines: [], mode: "summary", error: "The file has no order rows." };

  const headers = rows[0].map((h) => (h || "").toLowerCase().replace(/[^a-z0-9]/g, ""));
  const col = Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([k, aliases]) => [k, findHeader(headers, aliases)])
  ) as Record<keyof typeof HEADER_ALIASES, number>;

  if (col.item === -1 || col.qty === -1) {
    return {
      lines: [],
      mode: "summary",
      error: `Couldn't find the item name and quantity columns. Columns found: ${rows[0].join(", ")}`,
    };
  }

  // Summary exports merge many order lines into one row and only show ONE
  // customer's options, so add-ons/substitutions on those rows can't be counted.
  const mode: InputMode = col.order === -1 && /total ?quantity|summary/i.test(rows[0][col.qty]) ? "summary" : "line-items";

  const lines: OrderLine[] = [];
  for (const row of rows.slice(1)) {
    const itemName = decode(row[col.item] || "");
    const qty = parseFloat((row[col.qty] || "").replace(/[^\d.]/g, ""));
    if (!itemName || !Number.isFinite(qty) || qty <= 0) continue;
    const meta = parseMeta(col.meta === -1 ? "" : row[col.meta] || "");
    if (!meta["portions"] && col.portion !== -1 && row[col.portion]) meta["portions"] = decode(row[col.portion]);
    if (!meta["extras"] && col.extras !== -1 && row[col.extras]) meta["extras"] = decode(row[col.extras]);
    const productId = col.product === -1 ? undefined : Number(row[col.product]) || undefined;
    lines.push({ orderId: col.order === -1 ? undefined : row[col.order], productId, itemName, qty, meta });
  }
  return { lines, mode };
}

// ---------------------------------------------------------------- WooCommerce

/** The parts of a WooCommerce REST order we use. No customer details. */
export interface WooOrder {
  id: number;
  status: string;
  date_created: string;
  line_items: {
    name: string;
    product_id: number;
    variation_id?: number;
    quantity: number;
    meta_data: { key: string; value: unknown; display_key?: string; display_value?: unknown }[];
  }[];
}

/** Orders in these statuses get cooked. Pending (unpaid), failed, refunded and cancelled don't. */
export const COUNTED_STATUSES = ["processing", "on-hold", "completed"];

export function linesFromWooOrders(orders: WooOrder[]): OrderLine[] {
  const lines: OrderLine[] = [];
  for (const o of orders) {
    if (!COUNTED_STATUSES.includes(o.status)) continue;
    for (const li of o.line_items) {
      const meta: Record<string, string> = {};
      for (const m of li.meta_data || []) {
        if (!m.key || m.key.startsWith("_")) continue;
        const key = decode(String(m.display_key ?? m.key)).toLowerCase();
        const raw = m.display_value ?? m.value;
        const val = typeof raw === "string" || typeof raw === "number" ? decode(String(raw)) : "";
        if (key) meta[key] = val;
      }
      lines.push({ orderId: o.id, productId: li.product_id, itemName: decode(li.name), qty: li.quantity, meta });
    }
  }
  return lines;
}
