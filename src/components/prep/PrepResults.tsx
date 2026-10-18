"use client";

// src/components/prep/PrepResults.tsx
// The pull sheet on screen, laid out like the kitchen's paper sheet:
//   top: entrées by category x Small / Medium / Large / A la carte
//   bottom: contest prep by the pound (separate recipes, never combined)
//   then add-on proteins, substitutions, breakfast, containers, checks.

import React, { useMemo, useState } from "react";
import type { Catalog, EntreeRow, PrepResult, Size, WeeklyMenu } from "@/src/lib/prep/types";
import { catCode, catName, lb, meals, mealsLabel, oz, shortDish } from "./format";

const SIZES: { key: Size; label: string }[] = [
  { key: "S", label: "Small 4oz" },
  { key: "M", label: "Medium 6oz" },
  { key: "L", label: "Large 8oz" },
];

export default function PrepResults({ result, menu, catalog }: { result: PrepResult; menu: WeeklyMenu; catalog: Catalog }) {
  const [showRaw, setShowRaw] = useState(false);
  const batchById = useMemo(() => new Map(catalog.batches.map((b) => [b.id, b])), [catalog]);
  const entreeOz = result.entrees.reduce((s, e) => s + e.totalOz, 0);
  const contestProteinOz = result.contestPrep.filter((c) => c.kind === "protein").reduce((s, c) => s + c.oz, 0);
  const missing = result.review.filter((r) => r.severity === "missing").length;
  const specials = result.entrees.reduce((s, e) => s + e.fromSpecials, 0);
  const hasExtra = result.entrees.some((e) => e.extraProtein.count > 0);
  const c = result.containers;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Entrée meals" value={meals(result.mealsCounted)} />
        <Stat label="Entrée protein" value={`${lb(entreeOz)} lb`} />
        <Stat label="Contest prep protein" value={`${lb(contestProteinOz)} lb`} />
        <Stat label="Breakfast & snacks" value={String(c.breakfast)} />
        <Stat label="To check" value={String(result.review.length)} tone={missing ? "warn" : undefined} />
      </div>

      {result.exportMode === "summary" && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          This is a <b>summary</b> export, so add-ons and substitutions can&apos;t be counted exactly. Pull from the store
          instead, or switch the export to one row per order item.
        </div>
      )}

      {/* ---------------- Entrées ---------------- */}
      <section className="rounded-2xl border border-white/15 bg-white/5 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">Entrées</h3>
            <p className="text-sm text-white/55">Cooked ounces (and meals) by size. Totals are cooked weight.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-white/60">
            <input type="checkbox" checked={showRaw} onChange={(e) => setShowRaw(e.target.checked)} />
            Show raw estimate
          </label>
        </div>

        {/* Desktop table */}
        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/15 text-left text-white/55">
                <th className="py-2 pr-3 font-medium">Entrée</th>
                {SIZES.map((s) => (
                  <th key={s.key} className="py-2 pr-3 text-right font-medium">
                    {s.label}
                  </th>
                ))}
                <th className="py-2 pr-3 text-right font-medium">À la carte</th>
                {hasExtra && <th className="py-2 pr-3 text-right font-medium">+2 oz extra</th>}
                <th className="py-2 pr-3 text-right font-medium">Total</th>
                <th className="py-2 text-right font-medium">Cooked lb</th>
                {showRaw && <th className="py-2 pl-3 text-right font-medium">Est. raw lb</th>}
              </tr>
            </thead>
            <tbody>
              {result.entrees.map((e) => (
                <tr key={e.category} className="border-b border-white/10 last:border-0 align-top">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-baseline gap-2">
                      <span className="w-7 shrink-0 font-mono text-xs font-semibold text-white/50">{catCode(e.category)}</span>
                      <div>
                        <div className="font-medium">{e.dishes.map(shortDish).join(" / ")}</div>
                        <div className="text-xs text-white/45">
                          {e.ingredient ? e.ingredient : catName(e.category)}
                          {e.fromSpecials > 0 && ` · incl. ${meals(e.fromSpecials)} from specials`}
                        </div>
                      </div>
                    </div>
                  </td>
                  {SIZES.map((s) => (
                    <SizeTd key={s.key} cell={e.sizes[s.key]} plant={!e.ingredient} />
                  ))}
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {e.alaCarte.orders ? (
                      <>
                        {oz(e.alaCarte.oz)} oz<div className="text-xs text-white/45">{e.alaCarte.orders} lb ordered</div>
                      </>
                    ) : (
                      <span className="text-white/30">–</span>
                    )}
                  </td>
                  {hasExtra && (
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {e.extraProtein.count ? (
                        <>
                          {oz(e.extraProtein.oz)} oz<div className="text-xs text-white/45">×{e.extraProtein.count}</div>
                        </>
                      ) : (
                        <span className="text-white/30">–</span>
                      )}
                    </td>
                  )}
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {e.ingredient ? `${oz(e.totalOz)} oz` : <span className="text-white/30">–</span>}
                    <div className="text-xs text-white/45">{mealsLabel(e.totalMeals)}</div>
                  </td>
                  <td className="py-2.5 text-right text-base font-semibold tabular-nums">
                    {e.ingredient ? lb(e.totalOz) : <span className="text-sm font-normal text-white/40">see add-ons</span>}
                  </td>
                  {showRaw && (
                    <td className="py-2.5 pl-3 text-right tabular-nums text-white/70">{e.ingredient ? lb(e.estRawOz) : ""}</td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/20 text-white/60">
                <td className="pt-2.5 pr-3 text-xs uppercase tracking-wide">Containers</td>
                {SIZES.map((s) => (
                  <td key={s.key} className="pt-2.5 pr-3 text-right tabular-nums">
                    {c[s.key]}
                  </td>
                ))}
                <td colSpan={hasExtra ? 2 : 1} />
                <td className="pt-2.5 pr-3 text-right tabular-nums">{mealsLabel(c.S + c.M + c.L + c.other)}</td>
                <td className="pt-2.5 text-right font-semibold tabular-nums text-white">{lb(entreeOz)}</td>
                {showRaw && <td />}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mt-4 space-y-3 md:hidden">
          {result.entrees.map((e) => (
            <EntreeCard key={e.category} e={e} showRaw={showRaw} />
          ))}
          <div className="rounded-xl bg-white/5 px-4 py-3 text-sm text-white/70">
            Containers: Small {c.S} · Medium {c.M} · Large {c.L}
          </div>
        </div>

        {specials > 0 && (
          <p className="mt-4 text-xs text-white/45">
            Special meals are included in the size columns ({meals(specials)} meals). À la carte is counted at{" "}
            {catalog.alaCarteProteinOz} oz per order.
          </p>
        )}
      </section>

      {/* ---------------- Contest prep ---------------- */}
      <section className="rounded-2xl border border-white/15 bg-white/5 p-6">
        <h3 className="text-lg font-semibold">Contest prep by the pound</h3>
        <p className="text-sm text-white/55">Plain, in-house seasoning. Separate recipes, so not added to the entrées.</p>
        {result.contestPrep.length ? (
          <div className="mt-4 grid gap-x-10 md:grid-cols-2">
            {(["protein", "side"] as const).map((kind) => {
              const rows = result.contestPrep.filter((r) => r.kind === kind);
              if (!rows.length) return null;
              return (
                <table key={kind} className="w-full self-start text-sm">
                  <thead>
                    <tr className="border-b border-white/15 text-left text-white/55">
                      <th className="py-2 font-medium">{kind === "protein" ? "Protein" : "Sides"}</th>
                      <th className="py-2 text-right font-medium">Cooked lb</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.item} className="border-b border-white/10 last:border-0">
                        <td className="py-1.5">{r.item}</td>
                        <td className="py-1.5 text-right font-semibold tabular-nums">{lb(r.oz)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-white/50">No contest prep orders.</p>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ---------------- Add-ons ---------------- */}
        <section className="rounded-2xl border border-white/15 bg-white/5 p-6">
          <h3 className="text-lg font-semibold">Add-on proteins</h3>
          <p className="text-sm text-white/55">2 oz each.</p>
          {result.addOns.length ? (
            <ul className="mt-3 space-y-3 text-sm">
              {result.addOns.map((a) => (
                <li key={a.label}>
                  <div className="flex justify-between font-medium">
                    <span>{a.label}</span>
                    <span className="tabular-nums">
                      ×{a.count} · {oz(a.oz)} oz
                    </span>
                  </div>
                  <div className="text-xs text-white/50">
                    {Object.entries(a.on)
                      .map(([d, n]) => `${shortDish(d)} ×${n}`)
                      .join(" · ")}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-white/50">No add-ons.</p>
          )}
          {hasExtra && (
            <p className="mt-3 text-xs text-white/45">&quot;+2 oz of the same protein&quot; add-ons are in the Entrées table.</p>
          )}
        </section>

        {/* ---------------- Substitutions ---------------- */}
        <section className="rounded-2xl border border-white/15 bg-white/5 p-6">
          <h3 className="text-lg font-semibold">Substitutions</h3>
          <p className="text-sm text-white/55">Meals by size.</p>
          {result.substitutions.length ? (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-white/15 text-left text-white/55">
                  <th className="py-2 font-medium">Sub</th>
                  <th className="py-2 text-right font-medium">4oz</th>
                  <th className="py-2 text-right font-medium">6oz</th>
                  <th className="py-2 text-right font-medium">8oz</th>
                  <th className="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {result.substitutions.map((s) => (
                  <tr key={s.sub} className="border-b border-white/10 last:border-0">
                    <td className="py-1.5">{s.sub}</td>
                    <td className="py-1.5 text-right tabular-nums">{s.bySize.S || "–"}</td>
                    <td className="py-1.5 text-right tabular-nums">{s.bySize.M || "–"}</td>
                    <td className="py-1.5 text-right tabular-nums">{s.bySize.L || "–"}</td>
                    <td className="py-1.5 text-right font-semibold tabular-nums">{s.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 text-sm text-white/50">{result.exportMode === "summary" ? "Not available from a summary export." : "No substitutions."}</p>
          )}
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ---------------- Breakfast ---------------- */}
        <section className="rounded-2xl border border-white/15 bg-white/5 p-6">
          <h3 className="text-lg font-semibold">Breakfast &amp; snacks</h3>
          {result.breakfast.length ? (
            <ul className="mt-3 space-y-1.5 text-sm">
              {result.breakfast.map((b) => (
                <li key={b.name}>
                  <div className="flex justify-between gap-3">
                    <span>{b.name}</span>
                    <span className="font-semibold tabular-nums">{b.qty}</span>
                  </div>
                  {Object.keys(b.addOns).length > 0 && (
                    <div className="text-xs text-white/50">
                      {Object.entries(b.addOns)
                        .map(([k, n]) => `${k} ×${n}`)
                        .join(" · ")}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-white/50">No breakfast orders.</p>
          )}
        </section>

        {/* ---------------- Checks ---------------- */}
        <section className="rounded-2xl border border-white/15 bg-white/5 p-6">
          <h3 className="text-lg font-semibold">Check before prep</h3>
          {result.review.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {result.review.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${r.severity === "missing" ? "bg-amber-400" : "bg-white/40"}`} />
                  <span className="text-white/80">{r.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-white/50">Nothing to check.</p>
          )}
        </section>
      </div>

      {result.sides.length > 0 && (
        <details className="rounded-2xl border border-white/15 bg-white/5 p-6">
          <summary className="cursor-pointer text-lg font-semibold">Sides &amp; sauces</summary>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {result.sides.map((s) => {
                const n = Math.round(s.servings);
                return (
                  <tr key={s.side} className="border-b border-white/10 last:border-0">
                    <td className="py-1.5">{s.side}</td>
                    <td className="py-1.5 text-right tabular-nums text-white/75">
                      {[n ? `${n} serving${n === 1 ? "" : "s"}` : "", s.bulkOz ? `${lb(s.bulkOz)} lb à la carte` : ""]
                        .filter(Boolean)
                        .join(" + ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </details>
      )}

      <details className="rounded-2xl border border-white/15 bg-white/5 p-6">
        <summary className="cursor-pointer text-lg font-semibold">Ordering view: total by ingredient</summary>
        <p className="mt-2 text-sm text-white/55">
          Everything combined by what you buy, for ordering from suppliers. It mixes recipes, so cook from the sections above.
        </p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-white/15 text-left text-white/55">
              <th className="py-2 font-medium">Ingredient</th>
              <th className="py-2 text-right font-medium">Cooked lb</th>
              <th className="py-2 text-right font-medium">Est. raw lb</th>
            </tr>
          </thead>
          <tbody>
            {result.byIngredient.map((i) => (
              <tr key={i.ingredient} className="border-b border-white/10 last:border-0">
                <td className="py-1.5">{i.ingredient}</td>
                <td className="py-1.5 text-right tabular-nums">{lb(i.cookedOz)}</td>
                <td className="py-1.5 text-right tabular-nums text-white/70">{lb(i.estRawOz)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-white/40">Raw is an estimate from typical cooking loss. Weigh a batch raw and cooked to tune it.</p>
      </details>

      <details className="rounded-2xl border border-white/15 bg-white/5 p-6">
        <summary className="cursor-pointer text-lg font-semibold">Menu used: {menu.weekLabel}</summary>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-white/15 text-left text-white/55">
              <th className="py-2 pr-3 font-medium">Category</th>
              <th className="py-2 pr-3 font-medium">Dish</th>
              <th className="py-2 font-medium">Protein</th>
            </tr>
          </thead>
          <tbody>
            {menu.dishes.map((d) => {
              const b = d.protein ? batchById.get(d.protein) : undefined;
              return (
                <tr key={d.name + d.category} className="border-b border-white/10 last:border-0 text-white/80">
                  <td className="py-1.5 pr-3 font-mono text-xs">{catCode(d.category)}</td>
                  <td className="py-1.5 pr-3">{shortDish(d.name)}</td>
                  <td className="py-1.5">{b ? b.ingredient : <span className="text-white/40">none</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
    </>
  );
}

function SizeTd({ cell, plant }: { cell: { meals: number; oz: number }; plant: boolean }) {
  if (!cell.meals) return <td className="py-2.5 pr-3 text-right text-white/30">–</td>;
  return (
    <td className="py-2.5 pr-3 text-right tabular-nums">
      {plant ? <span className="text-white/40">–</span> : `${oz(cell.oz)} oz`}
      <div className="text-xs text-white/45">{mealsLabel(cell.meals)}</div>
    </td>
  );
}

function EntreeCard({ e, showRaw }: { e: EntreeRow; showRaw: boolean }) {
  const plant = !e.ingredient;
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <span className="mr-2 font-mono text-xs font-semibold text-white/50">{catCode(e.category)}</span>
          <span className="font-medium">{e.dishes.map(shortDish).join(" / ")}</span>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-semibold tabular-nums">{plant ? mealsLabel(e.totalMeals) : `${lb(e.totalOz)} lb`}</div>
          {showRaw && !plant && <div className="text-xs text-white/50">~{lb(e.estRawOz)} raw</div>}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs text-white/60">
        {(["S", "M", "L"] as const).map((s) => (
          <div key={s} className="rounded-lg bg-white/5 py-1.5">
            <div className="text-white/40">{s === "S" ? "4oz" : s === "M" ? "6oz" : "8oz"}</div>
            <div className="text-sm text-white tabular-nums">{meals(e.sizes[s].meals)}</div>
            {!plant && <div className="tabular-nums">{oz(e.sizes[s].oz)} oz</div>}
          </div>
        ))}
        <div className="rounded-lg bg-white/5 py-1.5">
          <div className="text-white/40">À la carte</div>
          <div className="text-sm text-white tabular-nums">{e.alaCarte.orders}</div>
          {!plant && <div className="tabular-nums">{oz(e.alaCarte.oz)} oz</div>}
        </div>
      </div>
      {e.extraProtein.count > 0 && (
        <div className="mt-2 text-xs text-white/60">
          +2 oz extra ×{e.extraProtein.count} ({oz(e.extraProtein.oz)} oz)
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
      <div className="text-xs text-white/55">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone === "warn" ? "text-amber-300" : ""}`}>{value}</div>
    </div>
  );
}
