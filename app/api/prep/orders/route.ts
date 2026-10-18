// app/api/prep/orders/route.ts
// GET /api/prep/orders?from=2026-10-12&to=2026-10-17[&gapFrom=2026-10-11]
// Pulls that week's orders and the relevant products from the store.
// gapFrom: days before the window that belong to no week (e.g. the Sunday before).
// Orders placed then aren't counted, but are reported so nothing slips through.
// Logged-in users only, reading their own business's store (plus an active
// subscription when REQUIRE_SUBSCRIPTION=true).

import { NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase-server";
import { COUNTED_STATUSES, linesFromWooOrders } from "@/src/lib/prep/input";
import { presetFor } from "@/src/lib/prep/presets";
import { devEnvStore, getMyBusiness, getMyConnection } from "@/src/lib/business";
import { fetchOrdersBetween, fetchProducts, WooError, type WooConfig } from "@/src/lib/woo/client";

export const dynamic = "force-dynamic";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  // 1) Same gate as the app page: logged in + active subscription.
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

  // Subscription check only once Stripe is set up (REQUIRE_SUBSCRIPTION=true).
  if (process.env.REQUIRE_SUBSCRIPTION === "true") {
    const { data: sub } = await supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle();
    if (sub?.status !== "active") return NextResponse.json({ error: "No active subscription." }, { status: 402 });
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
