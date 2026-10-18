"use client";

// src/components/ProteinCalculatorEmbed.tsx
// The business's settings (catalog + saved menus) come in as props. Without
// them it falls back to Hungry House's, as before.
//
// Default flow: pick the ordering week -> orders are pulled from the store ->
// pull sheet. CSV upload is kept as a backup.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { calculateFromLines } from "@/src/lib/prep/engine";
import { linesFromCSV } from "@/src/lib/prep/input";
import { menuFromStoreProducts, withBatches, type StoreProduct } from "@/src/lib/prep/store-menu";
import { defaultWeek, orderWeeks, type OrderWeek } from "@/src/lib/prep/weeks";
import { hungryHouseCatalog, savedMenus as hungryHouseMenus } from "@/src/lib/prep/hungry-house";
import type { Catalog, InputMode, OrderLine, PrepResult, WeeklyMenu } from "@/src/lib/prep/types";
import PrepResults from "@/src/components/prep/PrepResults";
import { downloadPullSheet } from "@/src/components/prep/pdf";

type StoreData = {
  from: string;
  to: string;
  fetchedAt: string;
  ordersCounted: number;
  ordersSkipped: Record<string, number>;
  gapOrders?: { id: number; date: string }[];
  lines: OrderLine[];
  products: StoreProduct[];
};

const STORE_MENU = "store";

export default function ProteinCalculatorEmbed({
  catalog = hungryHouseCatalog,
  savedMenus = hungryHouseMenus,
}: {
  catalog?: Catalog;
  savedMenus?: WeeklyMenu[];
} = {}) {
  const [source, setSource] = useState<"store" | "csv">("store");

  // ---- week + store data
  const weeks = useMemo(() => orderWeeks(new Date(), catalog.orderWeek, 6), [catalog.orderWeek]);
  const [week, setWeek] = useState<OrderWeek>(() => defaultWeek(weeks, new Date()));
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [storeError, setStoreError] = useState("");

  const pull = useCallback(async (w: OrderWeek) => {
    setLoading(true);
    setStoreError("");
    try {
      const gap = w.gapBefore ? `&gapFrom=${w.gapBefore.from}` : "";
      const res = await fetch(`/api/prep/orders?from=${w.start}&to=${w.end}${gap}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `Error ${res.status}`);
      setStore(body);
    } catch (e) {
      setStore(null);
      setStoreError(e instanceof Error ? e.message : "Couldn't reach the store.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (source === "store") pull(week);
  }, [source, week, pull]);

  // ---- csv
  const [csv, setCsv] = useState<{ name: string; text: string } | null>(null);
  const csvInput = useMemo(() => (csv ? linesFromCSV(csv.text) : null), [csv]);

  // ---- menu: a saved menu for this week if there is one, otherwise read from the store
  const savedForWeek = savedMenus.find((m) => m.ordersWeekStart === week.start);
  const [menuKey, setMenuKey] = useState<string>(savedForWeek?.weekLabel ?? STORE_MENU);
  useEffect(() => {
    setMenuKey(savedMenus.find((m) => m.ordersWeekStart === week.start)?.weekLabel ?? STORE_MENU);
  }, [week, savedMenus]);
  const canUseStoreMenu = source === "store";
  const effectiveMenuKey = !canUseStoreMenu && menuKey === STORE_MENU ? (savedMenus[0]?.weekLabel ?? "") : menuKey;

  const computed = useMemo(() => {
    let lines: OrderLine[] | null = null;
    let mode: InputMode = "store";
    if (source === "store" && store) lines = store.lines;
    if (source === "csv" && csvInput) {
      lines = csvInput.lines;
      mode = csvInput.mode;
    }
    if (!lines) return null;

    let menu: WeeklyMenu;
    let cat = catalog;
    const extraReview: PrepResult["review"] = [];
    if (effectiveMenuKey === STORE_MENU && store) {
      const sm = menuFromStoreProducts(store.products, catalog, {
        weekLabel: `Read from the store (${catalog.store.menuCategory})`,
        ordersWeekStart: week.start,
      });
      menu = sm.menu;
      cat = withBatches(catalog, sm.batches);
      extraReview.push(...sm.review);
      if (week.start !== defaultWeek(weeks, new Date()).start && !week.isOpen) {
        extraReview.push({
          severity: "check",
          message: `The store's "${catalog.store.menuCategory}" shows this week's menu, which may not match the week you picked. Special-meal slots could be off.`,
        });
      }
    } else if (savedMenus.length) {
      menu = savedMenus.find((m) => m.weekLabel === effectiveMenuKey) ?? savedMenus[0];
    } else {
      // CSV upload with no saved menus: match dishes by name only.
      menu = { weekLabel: "From the upload", dishes: [] };
      extraReview.push({
        severity: "check",
        message: "There's no saved menu to match these dishes against, so meal packs and categories may be incomplete. Use \"From the store\" for the full sheet.",
      });
    }

    if (source === "store" && store?.gapOrders?.length && week.gapBefore) {
      const n = store.gapOrders.length;
      extraReview.push({
        severity: "missing",
        message: `${n} paid order${n === 1 ? " was" : "s were"} placed on ${week.gapBefore.label}, outside the ordering window, so ${n === 1 ? "it isn't" : "they aren't"} counted in any week (order ${store.gapOrders.map((o) => "#" + o.id).join(", ")}). Check whether ${n === 1 ? "it belongs" : "they belong"} in this week.`,
      });
    }
    const result = calculateFromLines(lines, mode, cat, menu);
    if (csvInput?.error && source === "csv") extraReview.unshift({ severity: "missing", message: csvInput.error });
    result.review = [...extraReview.filter((r) => r.severity === "missing"), ...result.review, ...extraReview.filter((r) => r.severity === "check")];
    return { result, menu, catalog: cat };
  }, [source, store, csvInput, effectiveMenuKey, week, weeks, catalog, savedMenus]);

  function downloadPDF() {
    if (!computed) return;
    const title = source === "store" ? `Orders ${week.label} · delivery ${week.deliveryLabel}` : computed.menu.weekLabel;
    downloadPullSheet({
      businessName: catalog.businessName,
      title,
      sourceNote: source === "store" ? `${store?.ordersCounted ?? 0} orders from the store` : `from ${csv?.name}`,
      fileSlug: source === "store" ? week.start : computed.menu.weekLabel.replace(/\W+/g, "-").toLowerCase(),
      result: computed.result,
    });
  }

  const skipped = store ? Object.entries(store.ordersSkipped) : [];

  return (
    <div className="w-full space-y-6 text-white">
      <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Weekly Prep</h2>
            <p className="mt-1 text-sm text-white/60">What to pull for the week&apos;s orders, split by how it&apos;s prepped.</p>
          </div>
          <div className="flex rounded-xl border border-white/15 p-0.5 text-sm">
            {(["store", "csv"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={`rounded-lg px-3 py-1.5 ${source === s ? "bg-white text-black" : "text-white/70 hover:text-white"}`}
              >
                {s === "store" ? "From the store" : "Upload CSV"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          {source === "store" ? (
            <label className="block text-sm">
              <span className="text-white/60">Orders placed</span>
              <select
                value={week.start}
                onChange={(e) => setWeek(weeks.find((w) => w.start === e.target.value)!)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2"
              >
                {weeks.map((w) => (
                  <option key={w.start} value={w.start}>
                    {w.label} · delivery {w.deliveryLabel}
                    {w.isOpen ? " (so far)" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block text-sm">
              <span className="text-white/60">Order export (.csv)</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) f.text().then((text) => setCsv({ name: f.name, text }));
                }}
                className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-black"
              />
            </label>
          )}

          <label className="block text-sm">
            <span className="text-white/60">Menu</span>
            <select
              value={effectiveMenuKey}
              onChange={(e) => setMenuKey(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2"
            >
              {canUseStoreMenu && <option value={STORE_MENU}>Read from the store ({catalog.store.menuCategory})</option>}
              {!canUseStoreMenu && savedMenus.length === 0 && <option value="">Match by dish name</option>}
              {savedMenus.map((m) => (
                <option key={m.weekLabel} value={m.weekLabel}>
                  Saved: {m.weekLabel}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={downloadPDF}
            disabled={!computed || computed.result.rowsUsed === 0}
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black disabled:opacity-40"
          >
            Download pull sheet
          </button>
        </div>

        {source === "store" && (
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/60">
            {loading ? (
              <span>Pulling orders from the store…</span>
            ) : store ? (
              <>
                <span>
                  <b className="text-white">{store.ordersCounted}</b> orders
                  {skipped.length > 0 && <> · skipped {skipped.map(([s, n]) => `${n} ${s}`).join(", ")}</>}
                </span>
                <span>· updated {new Date(store.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                <button onClick={() => pull(week)} className="underline underline-offset-2 hover:text-white">
                  Refresh
                </button>
              </>
            ) : null}
          </div>
        )}
        {source === "store" && storeError && (
          <div className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {storeError}{" "}
            <button onClick={() => setSource("csv")} className="underline underline-offset-2">
              Upload a CSV instead
            </button>
          </div>
        )}
      </div>

      {computed && <PrepResults result={computed.result} menu={computed.menu} catalog={computed.catalog} />}
    </div>
  );
}
