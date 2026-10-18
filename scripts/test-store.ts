// Fakes WooCommerce + Supabase and runs the real route and calculator.
// Run: npx tsx scripts/test-store.ts
import assert from "node:assert/strict";
import { GET } from "../app/api/prep/orders/route";
import { calculateFromLines } from "../src/lib/prep/engine";
import { menuFromStoreProducts, withBatches } from "../src/lib/prep/store-menu";
import { hungryHouseCatalog as catalog, weekOfOct19 } from "../src/lib/prep/hungry-house";
import { defaultWeek, orderWeeks } from "../src/lib/prep/weeks";

import { orders, products } from "./fixtures";
import { seal, open } from "../src/lib/secret-box";
import { normalizeStoreUrl } from "../src/lib/woo/client";

// ---- fake fetch
const calls: string[] = [];
let failFirstAuth = true;
(globalThis as any).fetch = async (url: string, init?: any) => {
  calls.push(url);
  const u = new URL(url);
  const json = (body: any, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", ...headers } });
  if (failFirstAuth && init?.headers?.Authorization) { failFirstAuth = false; return new Response(JSON.stringify({ message: "nope" }), { status: 401 }); }
  if (u.pathname.endsWith("/orders")) {
    const page = Number(u.searchParams.get("page"));
    assert.equal(u.searchParams.get("after"), "2026-10-11T00:00:00"); // gap Sunday included in the fetch
    assert.equal(u.searchParams.get("before"), "2026-10-18T00:00:00");
    assert.ok(!u.searchParams.get("_fields")!.includes("billing"), "no customer fields");
    return json(page === 1 ? orders.slice(0, 2) : orders.slice(2), { "x-wp-totalpages": "2" });
  }
  if (u.pathname.endsWith("/products/categories")) return json([{ id: 9, name: "Current Menu" }]);
  if (u.pathname.endsWith("/products")) {
    if (u.searchParams.get("category") === "9") return json(products.filter((p) => p.categories.some((c) => c.id === 9)));
    const ids = u.searchParams.get("include")!.split(",").map(Number);
    return json(products.filter((p) => ids.includes(p.id)));
  }
  throw new Error("unexpected " + url);
};

// ---- fake supabase (tables: subscriptions, business_members, store_connections)
process.env.STORE_KEY_SECRET = Buffer.alloc(32, 7).toString("base64");
const sealedConn = {
  store_url: "https://eathungryhouse.com",
  key_enc: seal("ck_test"),
  secret_enc: seal("cs_test"),
  menu_category: null,
  connected_at: "2026-10-18T00:00:00Z",
};
const sb = (status: string | null, user = true, hasBusiness = true) => {
  const rows: Record<string, any> = {
    subscriptions: status ? { status } : null,
    business_members: hasBusiness ? { role: "owner", businesses: { id: "b1", name: "Hungry House", preset: "hungry-house" } } : null,
    store_connections: hasBusiness ? sealedConn : null,
  };
  const chain = (table: string): any => ({
    select: () => chain(table),
    eq: () => chain(table),
    maybeSingle: async () => ({ data: rows[table], error: null }),
  });
  return {
    auth: { getUser: async () => ({ data: { user: user ? { id: "u1" } : null } }) },
    rpc: async () => ({ data: null, error: null }),
    from: (t: string) => chain(t),
  };
};

process.env.REQUIRE_SUBSCRIPTION = "true";

(async () => {
  // gates
  (globalThis as any).__sb = sb(null, false);
  assert.equal((await GET(new Request("http://x/api/prep/orders?from=2026-10-11&to=2026-10-17"))).status, 401);
  (globalThis as any).__sb = sb("canceled");
  assert.equal((await GET(new Request("http://x/api/prep/orders?from=2026-10-11&to=2026-10-17"))).status, 402);
  (globalThis as any).__sb = sb("active");
  assert.equal((await GET(new Request("http://x/api/prep/orders?from=bad&to=2026-10-17"))).status, 400);
  // a new account with no business never sees anyone's store (env store off by default)
  process.env.WOO_STORE_URL = "https://eathungryhouse.com";
  process.env.WOO_CONSUMER_KEY = "ck_env";
  process.env.WOO_CONSUMER_SECRET = "cs_env";
  (globalThis as any).__sb = sb("active", true, false);
  assert.equal((await GET(new Request("http://x/api/prep/orders?from=2026-10-12&to=2026-10-17"))).status, 409);
  (globalThis as any).__sb = sb("active");

  // key encryption + store address cleanup
  assert.equal(open(seal("cs_abc")), "cs_abc");
  assert.notEqual(seal("cs_abc"), seal("cs_abc"), "fresh IV each time");
  assert.equal(normalizeStoreUrl("eathungryhouse.com/shop/"), "https://eathungryhouse.com");
  assert.equal(normalizeStoreUrl("http://www.x.com"), "https://www.x.com");
  for (const bad of ["localhost:3000", "http://127.0.0.1", "intranet", "https://db.internal", ""]) assert.equal(normalizeStoreUrl(bad), null, bad);
  console.log("business gate + key encryption: OK");

  const res = await GET(new Request("http://x/api/prep/orders?from=2026-10-12&to=2026-10-17&gapFrom=2026-10-11"));
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.equal(body.ordersCounted, 2);
  assert.deepEqual(body.gapOrders, [{ id: 5, date: "2026-10-11" }], "Sunday order reported, not counted");
  assert.deepEqual(body.ordersSkipped, { pending: 1, refunded: 1 });
  assert.ok(calls.some((c) => c.includes("consumer_key=ck_test")), "falls back to query auth after 401");
  console.log("route: OK", { lines: body.lines.length, products: body.products.length, skipped: body.ordersSkipped });

  // store menu + calculation
  const sm = menuFromStoreProducts(body.products, catalog, { weekLabel: "Store", ordersWeekStart: "2026-10-12" });
  console.log("store menu dishes:", sm.menu.dishes.map((d) => `${d.name}${d.slots ? " [" + d.slots + "]" : ""}${d.protein ? "" : " (no protein)"}`));
  console.log("store menu review:", sm.review.map((r) => r.message));
  const r = calculateFromLines(body.lines, "store", withBatches(catalog, sm.batches), sm.menu);
  const row = (c: string) => r.entrees.find((e) => e.category === c)!;
  // Chicken: Bulgogi M x4 (24) + 7-meal M 3 chicken (18) = 42 oz; pending/refunded 100 Large ignored
  assert.equal(row("chicken").sizes.M.oz, 24 + 18);
  assert.equal(row("chicken").sizes.M.meals, 7);
  assert.equal(row("chicken").fromSpecials, 3);
  // Turkey/pork slot (2 meals) split between meatballs and fajita -> 1 each
  assert.equal(row("turkey").sizes.M.meals, 1);
  // Pork: special 1 x 6 + 3 Medium x 6 = 24, a la carte 2 lb = 32, extra protein 3 x 2 = 6
  assert.equal(row("pork").sizes.M.oz, 6 + 18);
  assert.equal(row("pork").alaCarte.oz, 32);
  assert.deepEqual(row("pork").extraProtein, { count: 3, oz: 6 });
  assert.equal(row("pork").totalOz, 24 + 32 + 6);
  // Beef slot (2 meals) split between Shepherd's (ground beef) and Cuban steak (beef)
  assert.equal(row("groundbeef").sizes.L.oz, 8);
  assert.equal(row("groundbeef").sizes.M.oz, 6);
  assert.equal(row("beef").sizes.M.oz, 6);
  // Seafood: a la carte "Sweet Heat Salmon" (fuzzy) = 16 oz
  assert.equal(row("seafood").alaCarte.oz, 16);
  // Plant-based: meals only; add-ons tallied
  assert.equal(row("plant").sizes.S.meals, 2); // Harvest x2 (the stew is Large)
  assert.equal(row("plant").sizes.L.meals, 2);
  // Contest prep separate
  assert.deepEqual(r.contestPrep.map((c) => [c.item, c.oz]), [["Grilled Chicken", 48]]);
  // Add-ons 2 oz each, by dish
  const ao = Object.fromEntries(r.addOns.map((a) => [a.label, a]));
  assert.equal(ao["Grilled chicken"].count, 2 + 2); // stew x2 + harvest x2
  assert.equal(ao["Grilled chicken"].oz, 8);
  assert.equal(ao["Shrimp"].count, 2);
  assert.equal(ao["Sirloin steak"].on["Potato & Egg Scramble"], 1);
  // Subs by size
  const sub = Object.fromEntries(r.substitutions.map((x) => [x.sub, x]));
  assert.deepEqual(sub["Cauli Rice"].bySize, { S: 0, M: 4, L: 0 });
  assert.deepEqual(sub["Sweet Potatoes"].bySize, { S: 0, M: 3, L: 0 });
  // Breakfast counts with add-ons
  const bf = Object.fromEntries(r.breakfast.map((b) => [b.name, b]));
  assert.equal(bf["Yogurt Parfait"].qty, 2);
  assert.equal(bf["Potato & Egg Scramble"].addOns["Add Sirloin Steak"], 1);
  // Containers: 7-meal special (7 M) + Bulgogi 4 M + Pork 3 M = 14 M; S: Harvest 2; L: stew 2 + Shepherd's 1
  assert.deepEqual(r.containers, { S: 2, M: 14, L: 3, other: 0, breakfast: 3 });
  console.log("calculation: OK");
  console.log(r.entrees.map((e) => `  ${e.category}: S ${e.sizes.S.oz}/${e.sizes.S.meals} M ${e.sizes.M.oz}/${e.sizes.M.meals} L ${e.sizes.L.oz}/${e.sizes.L.meals} AC ${e.alaCarte.oz} +2 ${e.extraProtein.oz} = ${e.totalOz} oz`).join("\n"));
  console.log(r.review.map((x) => `  [${x.severity}] ${x.message}`).join("\n"));

  // saved menu on the same lines still works (name matching)
  const r2 = calculateFromLines(body.lines, "store", catalog, weekOfOct19);
  assert.equal(r2.entrees.find((e) => e.category === "pork")!.totalOz, 24 + 32 + 6, "saved menu gives the same pork total");
  console.log("saved menu on store lines: OK");

  // weeks
  const w = orderWeeks(new Date(2026, 9, 18, 10, 0), catalog.orderWeek, 3);
  assert.deepEqual(w.map((x) => [x.start, x.end, x.deliveryDate]), [["2026-10-12", "2026-10-18", "2026-10-19"], ["2026-10-05", "2026-10-11", "2026-10-12"], ["2026-09-28", "2026-10-04", "2026-10-05"]]);
  assert.equal(w[0].gapBefore, undefined, "Mon-Sun: no gap days");
  assert.equal(w[0].isOpen, true, "Sunday: still taking orders until 11:59pm");
  assert.equal(defaultWeek(w, new Date(2026, 9, 18, 10)).start, "2026-10-12", "Sunday: this week, for Monday delivery");
  const w2 = orderWeeks(new Date(2026, 9, 19, 10), catalog.orderWeek, 3);
  assert.equal(defaultWeek(w2, new Date(2026, 9, 19, 10)).start, "2026-10-12", "Delivery Monday: still last week");
  const w3 = orderWeeks(new Date(2026, 9, 21, 10), catalog.orderWeek, 3);
  assert.equal(defaultWeek(w3, new Date(2026, 9, 21, 10)).start, "2026-10-19", "Wednesday: this week so far");
  // The gap option still works for businesses with a closed day
  const g = orderWeeks(new Date(2026, 9, 18, 10), { startsOn: 1, days: 6, deliveryDaysAfterEnd: 2 }, 1);
  assert.equal(g[0].gapBefore?.from, "2026-10-11");
  console.log("weeks: OK", w.map((x) => `${x.label} (delivery ${x.deliveryLabel})`));
})().catch((e) => { console.error(e); process.exit(1); });
