// src/lib/prep/store-menu.ts
// Builds the weekly menu from the store's products, so nobody has to set it up
// by hand each week.
//
// Per product it reads:
//   - category "Current Menu"      -> on this week's menu (fills special-meal slots)
//   - attribute "Protein"          -> Chicken / Turkey / Beef / Steak / Pork / Salmon ...
//   - attribute "Prep Type"        -> Grilled / Shredded / Ground / Baked ...
//   - attributes "Starch", "Sides" -> optional, for side counts
// Products that were ordered but aren't on the Current Menu are still counted,
// they just don't fill special-meal slots. If Protein is missing, it's read from
// the product name and flagged.

import { decode, normalizeName } from "./input";
import type { Catalog, Category, Dish, ProteinBatch, ReviewItem, WeeklyMenu } from "./types";

/** The parts of a WooCommerce product we use. */
export interface StoreProduct {
  id: number;
  name: string;
  categories: string[];
  /** Attribute name -> options, e.g. { Protein: ["Chicken"], "Prep Type": ["Grilled"] } */
  attributes: Record<string, string[]>;
}

export interface StoreMenu {
  menu: WeeklyMenu;
  /** Protein batches for the store's dishes. Merge into the catalog before calculating. */
  batches: ProteinBatch[];
  review: ReviewItem[];
}

/** "Bulgogi Chicken (GF/DF)" -> "Bulgogi Chicken" */
function displayName(name: string) {
  return decode(name).replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

function attr(p: StoreProduct, name: string): string[] {
  const key = Object.keys(p.attributes).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? p.attributes[key].map((v) => decode(v).trim()).filter(Boolean) : [];
}

/** Products handled elsewhere (specials, a la carte, contest prep, breakfast/snacks). */
function isHandledElsewhere(p: StoreProduct, catalog: Catalog) {
  const n = normalizeName(p.name);
  if (catalog.specials.some((s) => n.startsWith(normalizeName(s.name)))) return true;
  if (n.startsWith("a la carte") || n.startsWith("contest prep")) return true;
  return catalog.countOnly.some((c) => normalizeName(c) === n);
}

export function menuFromStoreProducts(
  products: StoreProduct[],
  catalog: Catalog,
  opts: { weekLabel: string; ordersWeekStart?: string }
): StoreMenu {
  const s = catalog.store;
  const review: ReviewItem[] = [];
  const batches: ProteinBatch[] = [];
  const dishes: Dish[] = [];
  const countOnly: string[] = [];

  // Protein names we can recognise in a product name when the attribute is missing.
  const known = Object.keys(s.proteinRules).sort((a, b) => b.length - a.length);
  const guessProtein = (n: string) => known.find((k) => new RegExp(`\\b${k}\\b`, "i").test(n));
  const guessPrep = (n: string) =>
    /ground|meatball|meatloaf|picadillo|taco|sloppy|burger|bolognese/i.test(n)
      ? "Ground"
      : /shredded|pulled|barbacoa|carnitas|ropa vieja|guisada/i.test(n)
        ? "Shredded"
        : undefined;

  for (const p of products) {
    if (isHandledElsewhere(p, catalog)) continue;
    const name = displayName(p.name);
    const onMenu = p.categories.some((c) => decode(c).toLowerCase() === s.menuCategory.toLowerCase());
    const isVeg =
      /\((?:[^)]*\/)?V(?:\/[^)]*)?\)/.test(decode(p.name)) ||
      catalog.meatFree.some((n) => normalizeName(n) === normalizeName(p.name));
    let protein = attr(p, s.attributes.protein)[0];
    let prepType = attr(p, s.attributes.prep)[0];
    const starch = attr(p, s.attributes.starch)[0];
    const sides = attr(p, s.attributes.sides);
    const soldByOz = /\d+\s*oz/i.test(JSON.stringify(p.attributes));

    if (isVeg) {
      dishes.push({ name: decode(p.name), productIds: [p.id], category: "plant", starch, sides, slots: [] });
      continue;
    }
    if (!protein) {
      if (!soldByOz) {
        countOnly.push(decode(p.name)); // desserts, sauces, packs
        continue;
      }
      protein = guessProtein(name) || "";
      prepType = prepType || guessPrep(name) || "";
      if (!protein) {
        review.push({
          severity: "missing",
          message: `"${name}" has no Protein attribute in the store, so it isn't counted. Add Protein and Prep Type to the product.`,
        });
        continue;
      }
      if (onMenu) {
        review.push({
          severity: "check",
          message: `"${name}" has no Protein attribute, so it was read from the name as ${protein}${prepType ? ` (${prepType.toLowerCase()})` : ""}. Add Protein and Prep Type to the product to be sure.`,
        });
      }
    }

    const rule = s.proteinRules[protein.toLowerCase()];
    if (!rule) {
      review.push({ severity: "missing", message: `"${name}": Protein "${protein}" isn't set up yet, so it isn't counted.` });
      continue;
    }
    const prepKey = (prepType || "").toLowerCase();
    const ingredient = rule.byPrep?.[prepKey] || rule.ingredient;
    const category: Category = rule.byPrepCategory?.[prepKey] || rule.category;
    const batchId = `store-${p.id}`;
    batches.push({ id: batchId, ingredient, prep: prepType ? `${name} (${prepKey})` : name });
    dishes.push({
      name: decode(p.name),
      productIds: [p.id],
      category,
      protein: batchId,
      starch,
      sides,
      // Only this week's menu fills special-meal slots.
      slots: onMenu ? undefined : [],
    });
  }

  // Two dishes in one category on the menu usually means a product was left in the menu category.
  const onMenuIds = new Set(products.filter((p) => p.categories.some((c) => decode(c).toLowerCase() === s.menuCategory.toLowerCase())).map((p) => p.id));
  const perCat = new Map<string, string[]>();
  for (const d of dishes) {
    if (!d.productIds?.some((id) => onMenuIds.has(id))) continue;
    perCat.set(d.category, [...(perCat.get(d.category) || []), displayName(d.name)]);
  }
  for (const [cat, names] of perCat) {
    if (names.length > 1) {
      review.push({ severity: "check", message: `${names.join(" and ")} are both on the Current Menu as ${cat}. Their totals are combined into one row.` });
    }
  }

  return {
    menu: {
      weekLabel: opts.weekLabel,
      ordersWeekStart: opts.ordersWeekStart,
      dishes,
      countOnly,
    },
    batches,
    review,
  };
}

/** Catalog with the store menu's batches added, ready for calculateFromLines. */
export function withBatches(catalog: Catalog, batches: ProteinBatch[]): Catalog {
  return { ...catalog, batches: [...catalog.batches, ...batches] };
}
