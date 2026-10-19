// app/api/prep/orders/route.ts
// GET /api/prep/orders?from=2026-10-12&to=2026-10-17[&gapFrom=2026-10-11]
// Pulls that week's orders and the relevant products from the store.
// gapFrom: days before the window that belong to no week (e.g. the Sunday before).
// Orders placed then aren't counted, but are reported so nothing slips through.
// Logged-in users only, reading their own business's store, and only once
// they've paid (or their kitchen is comped).

import { NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase-server";
import { COUNTED_STATUSES, linesFromWooOrders } from "@/src/lib/prep/input";
import { presetFor } from "@/src/lib/prep/presets";
import { devEnvStore, getMyBusiness, getMyConnection, hasAccess } from "@/src/lib/business";
import { fetchOrdersBetween, fetchProducts, WooError } from "@/src/lib/woo/client";
import type { StoreConfig } from "@/src/lib/business";
import type { OrderLine } from "@/src/lib/prep/types";
import type { StoreProduct } from "@/src/lib/prep/store-menu";
import {
  FeedError,
  fetchFeed,
  feedOrderDate,
  feedStatusCounts,
  linesFromFeedOrders,
  storeProductsFromFeed,
} from "@/src/lib/feed/feed";

export const dynamic = "force-dynamic";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  // 1) Logged in.
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

  // Paid (or comped)? A local env store (ALLOW_ENV_STORE) skips this.
  if (!devEnvStore()) {
    try {
      if (!(await hasAccess(supabase))) {
        return NextResponse.json({ error: "Your subscription isn't active. Go to Billing to subscribe." }, { status: 402 });
      }
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't check your plan." }, { status: 500 });
    }
  }

  // 2) Validate the week.
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  if (!YMD.test(from) || !YMD.test(to) || from > to) {
    return NextResponse.json({ error: "Pick a valid date range." }, { status: 400 });
  }
  const gapFrom = searchParams.get("gapFrom") || "";
  if (gapFrom && (!YMD.test(gapFrom) || gapFrom > from)) {
    return NextResponse.json({ error: "Pick a valid date range." }, { status: 400 });
  }
  const days = (Date.parse(to) - Date.parse(gapFrom || from)) / 86_400_000;
  if (days > 31) return NextResponse.json({ error: "Pick a range of a month or less." }, { status: 400 });

  // 3) This user's store.
  let cfg: StoreConfig | null = null;
  let store = presetFor("standard").catalog.store;
  try {
    const business = await getMyBusiness(supabase, user);
    if (business) {
      const conn = await getMyConnection(supabase, business.id);
      if (conn) {
        cfg = conn.cfg;
        store = presetFor(business.preset, { menuCategory: conn.info.menuCategory }).catalog.store;
      }
    } else {
      const dev = devEnvStore();
      if (dev) {
        cfg = { platform: "woocommerce", woo: dev };
        store = presetFor("hungry-house").catalog.store;
      }
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't load your store." }, { status: 500 });
  }
  if (!cfg) {
    return NextResponse.json({ error: "Your store isn't connected yet." }, { status: 409 });
  }

  // 4) Orders from whichever platform, in one shape.
  type Summary = { id: number | string; date: string; status: string; counts: boolean };
  let summaries: Summary[];
  let lines: OrderLine[];
  let products: StoreProduct[];

  try {
    if (cfg.platform === "feed") {
      const feed = await fetchFeed(cfg.feed, gapFrom || from, to);
      const inRange = feed.orders.filter((o) => feedOrderDate(o) <= to);
      summaries = inRange.map((o) => ({ id: o.id, date: feedOrderDate(o), status: String(o.status).toLowerCase(), counts: feedStatusCounts(o.status) }));
      lines = linesFromFeedOrders(inRange.filter((o) => feedOrderDate(o) >= from));
      products = storeProductsFromFeed(feed.products, store.attributes);
    } else {
      const fetched = await fetchOrdersBetween(cfg.woo, gapFrom || from, to);
      summaries = fetched.map((o) => ({ id: o.id, date: o.date_created.slice(0, 10), status: o.status, counts: COUNTED_STATUSES.includes(o.status) }));
      lines = linesFromWooOrders(fetched.filter((o) => o.date_created.slice(0, 10) >= from));
      products = await fetchProducts(cfg.woo, lines.map((l) => l.productId || 0), store.menuCategory);
    }
  } catch (e) {
    const rejected = (e instanceof WooError || e instanceof FeedError) && (e.status === 401 || e.status === 403);
    const msg = rejected
      ? cfg.platform === "feed"
        ? "Your site rejected the feed key. Check the key matches in Prepline and on your site."
        : "The store rejected the API key. Check it's a Read key and copied correctly."
      : e instanceof Error
        ? e.message
        : "Couldn't reach the store.";
    return NextResponse.json({ error: msg }, { status: e instanceof WooError || e instanceof FeedError ? 502 : 500 });
  }

  const inWindow = summaries.filter((o) => o.date >= from);
  const skipped: Record<string, number> = {};
  for (const o of inWindow) if (!o.counts) skipped[o.status] = (skipped[o.status] || 0) + 1;

  return NextResponse.json({
    from,
    to,
    platform: cfg.platform,
    fetchedAt: new Date().toISOString(),
    ordersCounted: inWindow.filter((o) => o.counts).length,
    ordersSkipped: skipped,
    // Paid orders placed in the gap before the window (not counted in any week).
    gapOrders: summaries.filter((o) => o.date < from && o.counts).map((o) => ({ id: o.id, date: o.date })),
    lines,
    products,
  });
}
