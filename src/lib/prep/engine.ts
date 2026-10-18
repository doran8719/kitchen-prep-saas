// src/lib/prep/engine.ts
// Order lines + catalog + weekly menu -> kitchen pull sheet.
// Pure functions, no React/DOM, so it runs in the browser, on the server, or in a script.

import { decode, linesFromCSV, normalizeName } from "./input";
import {
  CATEGORY_ORDER,
  CATEGORY_SLOT,
  sizeFromOz,
  type AddOnRow,
  type Catalog,
  type Category,
  type ContestRow,
  type CountRow,
  type Dish,
  type EntreeRow,
  type InputMode,
  type OrderLine,
  type PrepResult,
  type ReviewItem,
  type SideTotal,
  type Size,
  type SubRow,
  type WeeklyMenu,
} from "./types";

export { decode, normalizeName, parseCSV, parseMeta } from "./input";

/** "Medium 6oz" -> 6, "1 lb" -> 16, "4oz" -> 4, "Double Pack" -> null */
export function parseOunces(s: string): number | null {
  const t = (s || "").toLowerCase();
  const n = t.match(/(\d+(?:\.\d+)?)\s*(oz|ounce|lb|pound)/);
  if (!n) return null;
  const v = parseFloat(n[1]);
  return n[2].startsWith("lb") || n[2].startsWith("pound") ? v * 16 : v;
}

/** "Sub Sweet Potatoes (GF/DF) ($1.00)" -> "Sweet Potatoes" */
function cleanOption(s: string): string {
  return decode(s)
    .replace(/\(\s*\$[^)]*\)/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/^\s*(sub|add|side of)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** For messages: keep "Add"/"Sub", drop prices and diet tags. */
function displayOption(s: string): string {
  return decode(s).replace(/\s*\(\s*\$[^)]*\)/g, "").replace(/\s*\((GF|DF|V)[^)]*\)/gi, "").trim();
}

/** "Add Grilled Chicken ($1.50), Add Shrimp ($2.00)" -> ["Add Grilled Chicken", "Add Shrimp"] */
function splitOptions(s: string): string[] {
  return decode(s)
    .replace(/\(\s*\$[^)]*\)/g, "")
    .split(/,\s*(?=[A-Za-z])/)
    .map((x) => x.trim())
    .filter(Boolean);
}

const baseName = (itemName: string) =>
  itemName.includes(" - ") ? itemName.slice(0, itemName.lastIndexOf(" - ")) : itemName;

/** CSV in, pull sheet out. Kept for the upload fallback. */
export function calculatePrep(csvText: string, catalog: Catalog, menu: WeeklyMenu): PrepResult {
  const input = linesFromCSV(csvText);
  const result = calculateFromLines(input.lines, input.mode, catalog, menu);
  if (input.error) result.review.unshift({ severity: "missing", message: input.error });
  return result;
}

const emptySizes = () => ({ S: { meals: 0, oz: 0 }, M: { meals: 0, oz: 0 }, L: { meals: 0, oz: 0 } });

export function calculateFromLines(
  lines: OrderLine[],
  mode: InputMode,
  catalog: Catalog,
  menu: WeeklyMenu
): PrepResult {
  const review: ReviewItem[] = [];
  const isSummary = mode === "summary";

  // ---- lookups
  const batchById = new Map(catalog.batches.map((b) => [b.id, b]));
  const dishByName = new Map<string, Dish>();
  const dishByProduct = new Map<number, Dish>();
  for (const d of menu.dishes) {
    for (const n of [d.name, ...(d.aliases || [])]) dishByName.set(normalizeName(n), d);
    for (const id of d.productIds || []) dishByProduct.set(id, d);
  }
  const contestByName = new Map(catalog.contestPrep.map((c) => [normalizeName(c.name), c]));
  const alaCarteByName = new Map(catalog.alaCarte.map((c) => [normalizeName(c.name), c]));
  const countOnlySet = new Set([...catalog.countOnly, ...(menu.countOnly || [])].map(normalizeName));
  const slotsOf = (d: Dish) => d.slots ?? (CATEGORY_SLOT[d.category] ? [CATEGORY_SLOT[d.category]!] : []);

  /** A la carte options are often a shortened dish name ("Sweet Heat Salmon" for "Sweet Heat Chili Salmon"). */
  function findDishLoose(choice: string): Dish | undefined {
    const key = normalizeName(choice);
    const exact = dishByName.get(key);
    if (exact) return exact;
    const words = new Set(key.split(" "));
    let best: { dish: Dish; score: number } | undefined;
    for (const [name, dish] of dishByName) {
      const dw = name.split(" ");
      const overlap = dw.filter((w) => words.has(w)).length;
      const subset = overlap === dw.length || overlap === words.size;
      if (subset && overlap >= 2 && (!best || overlap > best.score)) best = { dish, score: overlap };
    }
    return best?.dish;
  }

  // ---- accumulators
  const rows = new Map<Category, EntreeRow>();
  const ingredientOz = new Map<string, number>();
  const contest = new Map<string, ContestRow>();
  const addOns = new Map<string, AddOnRow>();
  const subs = new Map<string, SubRow>();
  const breakfast = new Map<string, CountRow>();
  const sides = new Map<string, SideTotal>();
  const containers = { S: 0, M: 0, L: 0, other: 0, breakfast: 0 };
  let rowsUsed = 0;
  let mealsCounted = 0;

  function row(d: Dish): EntreeRow {
    let r = rows.get(d.category);
    if (!r) {
      const b = d.protein ? batchById.get(d.protein) : undefined;
      r = {
        category: d.category,
        dishes: [],
        ingredient: b?.ingredient,
        prep: b?.prep,
        sizes: emptySizes(),
        otherSizes: { meals: 0, oz: 0 },
        alaCarte: { orders: 0, oz: 0 },
        extraProtein: { count: 0, oz: 0 },
        fromSpecials: 0,
        totalOz: 0,
        totalMeals: 0,
        estRawOz: 0,
      };
      rows.set(d.category, r);
    }
    if (!r.dishes.includes(d.name)) r.dishes.push(d.name);
    return r;
  }
  // Show every category on this week's menu, even with no orders yet.
  for (const d of menu.dishes) row(d);

  function addIngredient(batchId: string | undefined, oz: number) {
    const b = batchId ? batchById.get(batchId) : undefined;
    if (!b || !oz) return;
    ingredientOz.set(b.ingredient, (ingredientOz.get(b.ingredient) || 0) + oz);
  }

  function addMeals(d: Dish, size: Size | null, meals: number, portionOz: number, special: boolean) {
    const r = row(d);
    const oz = d.protein ? meals * portionOz : 0;
    const cell = size ? r.sizes[size] : r.otherSizes;
    cell.meals += meals;
    cell.oz += oz;
    if (special) r.fromSpecials += meals;
    addIngredient(d.protein, oz);
  }

  function addSide(name: string, servings: number, bulkOz = 0) {
    const key = name.trim();
    if (!key) return;
    const s = sides.get(key) || { side: key, servings: 0, bulkOz: 0 };
    s.servings += servings;
    s.bulkOz += bulkOz;
    sides.set(key, s);
  }

  function addDishSides(d: Dish, qty: number, starchOverride?: string) {
    const starch = starchOverride || d.starch;
    if (starch) addSide(starch, qty);
    for (const s of d.sides || []) addSide(s, qty);
  }

  function addAddOn(label: string, qty: number, oz: number, on: string, batchId?: string) {
    const a = addOns.get(label) || { label, count: 0, oz: 0, on: {} };
    a.count += qty;
    a.oz += oz * qty;
    a.on[on] = (a.on[on] || 0) + qty;
    addOns.set(label, a);
    addIngredient(batchId, oz * qty);
  }

  function addSub(sub: string, size: Size | null, qty: number) {
    const s = subs.get(sub) || { sub, bySize: { S: 0, M: 0, L: 0 }, other: 0, total: 0 };
    if (size) s.bySize[size] += qty;
    else s.other += qty;
    s.total += qty;
    subs.set(sub, s);
  }

  /** Applies the add-ons on a line. Returns the ones it didn't recognise. */
  function applyExtras(extrasText: string, qty: number, dish: Dish | undefined, onName: string): string[] {
    const unknown: string[] = [];
    for (const opt of splitOptions(extrasText)) {
      const ex = catalog.extras.find((e) => opt.toLowerCase().includes(e.match.toLowerCase()));
      if (!ex) {
        unknown.push(displayOption(opt));
        continue;
      }
      if (ex.protein === "same") {
        if (dish?.protein) {
          const r = row(dish);
          r.extraProtein.count += qty;
          r.extraProtein.oz += ex.oz * qty;
          addIngredient(dish.protein, ex.oz * qty);
        } else {
          flag({ severity: "check", message: `${onName} ×${qty}: "${displayOption(opt)}" on a dish with no protein set up. Not counted.` });
        }
      } else {
        addAddOn(ex.label, qty, ex.oz, onName, ex.protein);
      }
    }
    return unknown;
  }

  function dishesForSlot(slotKey: string): Dish[] {
    const wanted = slotKey.toLowerCase().split("/").map((s) => s.trim());
    return menu.dishes.filter((d) => d.protein && slotsOf(d).some((s) => wanted.includes(s)));
  }

  const seen = new Set<string>();
  function flag(item: ReviewItem) {
    if (seen.has(item.message)) return;
    seen.add(item.message);
    review.push(item);
  }

  // ---- lines
  for (const line of lines) {
    const { itemName, qty, meta } = line;
    const portionOz = parseOunces(meta["portions"] || itemName);
    const size = sizeFromOz(portionOz);
    const extrasText = meta["extras"] || "";
    const subsText = meta["substitutes"] || "";
    const saucesText = meta["sauces"] || "";
    const note = meta["special requests"] || "";
    const label = `${itemName} ×${qty}`;

    // ---------- Specials
    const special = catalog.specials.find((s) => normalizeName(itemName).startsWith(normalizeName(s.name)));
    if (special) {
      rowsUsed++;
      if (!portionOz) {
        flag({ severity: "missing", message: `${label}: no readable portion size.` });
        continue;
      }
      for (const [slotKey, count] of Object.entries(special.mix)) {
        const dishes = dishesForSlot(slotKey);
        if (!dishes.length) {
          flag({
            severity: "missing",
            message: `${special.name}: no dish on this week's menu fills the "${slotKey}" slot, so ${count} meal${count === 1 ? "" : "s"} per special aren't counted.`,
          });
          continue;
        }
        if (dishes.length > 1) {
          flag({
            severity: "check",
            message: `Special meals: the "${slotKey}" meals are split evenly between ${dishes.map((d) => d.name).join(" and ")}. Confirm that's how the kitchen fills them.`,
          });
        }
        const perDish = (count * qty) / dishes.length;
        for (const d of dishes) {
          addMeals(d, size, perDish, portionOz, true);
          addDishSides(d, perDish);
        }
        mealsCounted += count * qty;
        if (size) containers[size] += count * qty;
        else containers.other += count * qty;
      }
      if (note) {
        flag({
          severity: "check",
          message: `${label}: customer note "${note}". Counted as the standard mix. Adjust if they picked different meals.`,
        });
      }
      continue;
    }

    // ---------- Contest prep by the pound
    if (/^contest prep protein by the pound/i.test(itemName)) {
      rowsUsed++;
      const choice = decode(meta["protein & sides"] || meta["protein and sides"] || "");
      const item = contestByName.get(normalizeName(choice));
      if (!item) {
        flag({ severity: "missing", message: `Contest prep option "${choice || "(blank)"}" isn't set up. ${qty} lb not counted.` });
        continue;
      }
      const oz = (portionOz ?? 16) * qty;
      const key = item.name;
      const c = contest.get(key) || {
        item: item.name,
        kind: item.protein ? ("protein" as const) : ("side" as const),
        ingredient: item.protein ? batchById.get(item.protein)?.ingredient : undefined,
        oz: 0,
      };
      c.oz += oz;
      contest.set(key, c);
      if (item.protein) addIngredient(item.protein, oz);
      if (note) flag({ severity: "check", message: `${label} (${choice}): customer note "${note}".` });
      continue;
    }

    // ---------- A la carte
    if (/^a la carte/i.test(itemName)) {
      rowsUsed++;
      const choice = meta["a la carte options"] || itemName.split(" - ").slice(1).join(" - ");
      const side = alaCarteByName.get(normalizeName(choice));
      const dish = side ? undefined : findDishLoose(choice);
      if (side?.side) {
        if (catalog.alaCarteSideOz) addSide(side.side, 0, catalog.alaCarteSideOz * qty);
        else addSide(side.side, qty);
      } else if (dish?.protein) {
        const r = row(dish);
        r.alaCarte.orders += qty;
        r.alaCarte.oz += catalog.alaCarteProteinOz * qty;
        addIngredient(dish.protein, catalog.alaCarteProteinOz * qty);
      } else if (dish) {
        flag({ severity: "missing", message: `A la carte "${choice}" ×${qty} is ${dish.name}, which has no protein set up. Not counted.` });
      } else {
        flag({ severity: "missing", message: `A la carte "${choice}" ×${qty} doesn't match a dish on this week's menu. Not counted.` });
      }
      if (note) flag({ severity: "check", message: `${label}: customer note "${note}".` });
      continue;
    }

    // ---------- Weekly dishes and breakfast
    const base = baseName(itemName);
    const dish = (line.productId && dishByProduct.get(line.productId)) || dishByName.get(normalizeName(base));

    if (!dish) {
      if (countOnlySet.has(normalizeName(base))) {
        rowsUsed++;
        const suffix = itemName.slice(base.length).replace(/^\s*-\s*/, "");
        const key = suffix && !/^\d+\s*oz$/i.test(suffix) ? `${base} – ${suffix}` : base;
        const b = breakfast.get(key) || { name: key, qty: 0, addOns: {} };
        b.qty += qty;
        containers.breakfast += qty;
        if (extrasText) {
          if (isSummary) {
            flag({ severity: "check", message: `${label}: at least one order has "${displayOption(extrasText)}". The summary export can't say how many.` });
          } else {
            for (const opt of splitOptions(extrasText)) b.addOns[displayOption(opt)] = (b.addOns[displayOption(opt)] || 0) + qty;
            applyExtras(extrasText, qty, undefined, base);
          }
        }
        if (subsText && !isSummary) for (const s of splitOptions(subsText)) b.addOns[displayOption(s)] = (b.addOns[displayOption(s)] || 0) + qty;
        breakfast.set(key, b);
        if (note) flag({ severity: "check", message: `${label}: customer note "${note}".` });
        continue;
      }
      flag({ severity: "missing", message: `${label}: "${base}" isn't on this week's menu. Not counted.` });
      continue;
    }

    rowsUsed++;
    mealsCounted += qty;
    if (size) containers[size] += qty;
    else containers.other += qty;
    if (dish.protein && portionOz == null) {
      flag({ severity: "missing", message: `${label}: no readable portion size.` });
      addMeals(dish, null, qty, 0, false);
    } else {
      addMeals(dish, size, qty, portionOz ?? 0, false);
    }

    if (isSummary) {
      // Can't tell how many of the qty actually chose these, so flag, don't count.
      addDishSides(dish, qty);
      const opts = [extrasText, subsText, saucesText].filter(Boolean).map(displayOption).join("; ");
      if (opts) {
        flag({
          severity: "check",
          message: `${label}: at least one order has "${opts}". The summary export can't say how many, so these aren't counted.`,
        });
      }
    } else {
      const sub = subsText ? cleanOption(subsText) : undefined;
      if (sub) addSub(sub, size, qty);
      addDishSides(dish, qty, sub);
      const unknown = applyExtras(extrasText, qty, dish, dish.name);
      for (const u of unknown) flag({ severity: "check", message: `"${u}" on ${dish.name} isn't a known add-on, so it isn't counted.` });
      for (const sauce of splitOptions(saucesText)) addSide(cleanOption(sauce), qty);
    }
    if (note) flag({ severity: "check", message: `${label}: customer note "${note}".` });
  }

  // ---- totals
  const yieldOf = (ing?: string) => (ing && catalog.yields[ing]) || catalog.defaultYield;
  const entrees = CATEGORY_ORDER.filter((c) => rows.has(c)).map((c) => {
    const r = rows.get(c)!;
    const sizeOz = r.sizes.S.oz + r.sizes.M.oz + r.sizes.L.oz + r.otherSizes.oz;
    r.totalOz = sizeOz + r.alaCarte.oz + r.extraProtein.oz;
    r.totalMeals = r.sizes.S.meals + r.sizes.M.meals + r.sizes.L.meals + r.otherSizes.meals;
    r.estRawOz = r.ingredient ? r.totalOz / yieldOf(r.ingredient) : 0;
    return r;
  });

  const contestOrder = new Map(catalog.contestPrep.map((c, i) => [c.name, i]));
  const contestPrep = [...contest.values()].sort(
    (a, b) => (a.kind === b.kind ? 0 : a.kind === "protein" ? -1 : 1) || (contestOrder.get(a.item) ?? 99) - (contestOrder.get(b.item) ?? 99)
  );

  const byIngredient = [...ingredientOz.entries()]
    .map(([ingredient, cookedOz]) => ({ ingredient, cookedOz, yield: yieldOf(ingredient), estRawOz: cookedOz / yieldOf(ingredient) }))
    .sort((a, b) => b.cookedOz - a.cookedOz);

  return {
    exportMode: mode,
    rowsRead: lines.length,
    rowsUsed,
    mealsCounted,
    entrees,
    contestPrep,
    addOns: [...addOns.values()].sort((a, b) => b.count - a.count),
    substitutions: [...subs.values()].sort((a, b) => b.total - a.total),
    breakfast: [...breakfast.values()].sort((a, b) => a.name.localeCompare(b.name)),
    containers,
    sides: [...sides.values()].sort((a, b) => b.servings + b.bulkOz / 16 - (a.servings + a.bulkOz / 16)),
    byIngredient,
    review: review.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "missing" ? -1 : 1)),
  };
}
