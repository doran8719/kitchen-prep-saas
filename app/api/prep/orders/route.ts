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
import { fetchOrdersBetween, fetchProducts, WooError, type WooConfig } from "@/src/lib/woo/client";

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
  let cfg: WooConfig | null = null;
  let menuCategory = presetFor("standard").catalog.store.menuCategory;
  try {
    const business = await getMyBusiness(supabase, user);
    if (business) {
      const conn = await getMyConnection(supabase, business.id);
      if (conn) {
        cfg = conn.cfg;
        menuCategory = presetFor(business.preset, { menuCategory: conn.info.menuCategory }).catalog.store.menuCategory;
      }
    } else {
      cfg = devEnvStore();
      if (cfg) menuCategory = presetFor("hungry-house").catalog.store.menuCategory;
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't load your store." }, { status: 500 });
  }
  if (!cfg) {
    return NextResponse.json({ error: "Your store isn't connected yet." }, { status: 409 });
  }

  try {
    const fetched = await fetchOrdersBetween(cfg, gapFrom || from, to);
    const inWindow = (o: { date_created: string }) => o.date_created.slice(0, 10) >= from;
    const orders = fetched.filter(inWindow);
    const gapOrders = fetched.filter((o) => !inWindow(o) && COUNTED_STATUSES.includes(o.status));
    const lines = linesFromWooOrders(orders);
    const products = await fetchProducts(
      cfg,
      lines.map((l) => l.productId || 0),
      menuCategory
    );

    const skipped: Record<string, number> = {};
    for (const o of orders) if (!COUNTED_STATUSES.includes(o.status)) skipped[o.status] = (skipped[o.status] || 0) + 1;

    return NextResponse.json({
      from,
      to,
      fetchedAt: new Date().toISOString(),
      ordersCounted: orders.length - Object.values(skipped).reduce((a, b) => a + b, 0),
      ordersSkipped: skipped,
      // Paid orders placed in the gap before the window (not counted in any week).
      gapOrders: gapOrders.map((o) => ({ id: o.id, date: o.date_created.slice(0, 10) })),
      lines,
      products,
    });
  } catch (e) {
    const status = e instanceof WooError ? 502 : 500;
    const msg =
      e instanceof WooError && (e.status === 401 || e.status === 403)
        ? "The store rejected the API key. Check it's a Read key and copied correctly."
        : e instanceof Error
          ? e.message
          : "Couldn't reach the store.";
    return NextResponse.json({ error: msg }, { status });
  }
}
