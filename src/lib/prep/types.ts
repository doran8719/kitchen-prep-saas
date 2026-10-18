// src/lib/prep/types.ts
// Shared types for the prep calculator.
//
// The pull sheet mirrors how the kitchen already works (Alexandra's sheet):
//   - Entrées by category (C, T, P, B, GB, S, PB) x Small / Medium / Large /
//     A la carte, in ounces and meal counts, totalled in cooked pounds.
//   - Contest prep by the pound, kept separate (different recipes).
//   - Add-on proteins (2 oz each), substitutions by size, breakfast counts.
//
// Setup has two layers:
//   1. Catalog: set up once per business.
//   2. Weekly menu: one dish per category. Saved by hand, or read from the
//      store's "Current Menu" products (store-menu.ts).

/** Entrée categories, one dish each per week. */
export type Category = "chicken" | "turkey" | "pork" | "beef" | "groundbeef" | "seafood" | "plant";

export const CATEGORY_ORDER: Category[] = ["chicken", "turkey", "pork", "beef", "groundbeef", "seafood", "plant"];
export const CATEGORY_LABEL: Record<Category, { code: string; name: string }> = {
  chicken: { code: "C", name: "Chicken" },
  turkey: { code: "T", name: "Turkey" },
  pork: { code: "P", name: "Pork" },
  beef: { code: "B", name: "Beef / steak" },
  groundbeef: { code: "GB", name: "Ground beef" },
  seafood: { code: "S", name: "Seafood" },
  plant: { code: "PB", name: "Plant-based" },
};

/** Special-meal slot a dish can fill ("2 chicken, 1 turkey, 2 beef"). */
export type Slot = "chicken" | "turkey" | "pork" | "beef" | "fish";

/** Default special slot for each category (beef and ground beef both fill "beef"). */
export const CATEGORY_SLOT: Record<Category, Slot | undefined> = {
  chicken: "chicken",
  turkey: "turkey",
  pork: "pork",
  beef: "beef",
  groundbeef: "beef",
  seafood: "fish",
  plant: undefined,
};

/** Meal sizes, by portion ounces. */
export type Size = "S" | "M" | "L";
export const SIZE_OZ: Record<Size, number> = { S: 4, M: 6, L: 8 };
export const sizeFromOz = (oz: number | null): Size | null => (oz === 4 ? "S" : oz === 6 ? "M" : oz === 8 ? "L" : null);

/**
 * A protein batch = one thing the kitchen cooks.
 * Two batches can share an ingredient (e.g. "Chicken Breast" grilled plain for
 * contest prep, and "Chicken Breast" with bulgogi marinade for the entrée).
 */
export interface ProteinBatch {
  id: string;
  /** What gets pulled from the walk-in / ordered from the supplier. */
  ingredient: string;
  /** How it's cooked, e.g. "Grilled – contest plain". */
  prep: string;
}

export interface Dish {
  /** Product name in WooCommerce, without the size suffix. "(GF/DF)" etc. are ignored when matching. */
  name: string;
  /** WooCommerce product ids. Matched before the name, so renames don't break anything. */
  productIds?: number[];
  /** Other names the same dish appears under, e.g. its a la carte option ("Sweet Heat Salmon"). */
  aliases?: string[];
  category: Category;
  /** Batch id for the dish's protein. Omit for plant-based dishes. */
  protein?: string;
  /** Special-meal slots. Defaults to the category's slot. [] = fills none (e.g. a leftover dish). */
  slots?: Slot[];
  /** Main starch, counted in servings. A "Sub ..." substitution replaces this. */
  starch?: string;
  /** Other sides/veg, counted in servings. */
  sides?: string[];
}

export interface SpecialDef {
  /** Product name, e.g. "5 Meal Special". */
  name: string;
  /** Meals per slot. A slot key can combine slots: "turkey/pork". */
  mix: Record<string, number>;
}

export interface CatalogItem {
  /** The option text the customer picks, e.g. "Grilled Chicken Thighs". */
  name: string;
  /** Batch id if it's a protein. */
  protein?: string;
  /** Side name if it's a side (rice, potatoes, veg). */
  side?: string;
}

export interface ExtraDef {
  /** Text that identifies the add-on in the order, e.g. "Add Grilled Chicken". */
  match: string;
  /** Batch id, or "same" = more of the dish's own protein. */
  protein: string | "same";
  /** Label on the pull sheet, e.g. "Grilled chicken". */
  label: string;
  /** Cooked oz per add-on. */
  oz: number;
}

/** How a store product's "Protein" attribute maps to what the kitchen pulls. */
export interface StoreProteinRule {
  /** Ingredient to pull, e.g. "Chicken Breast". */
  ingredient: string;
  /** Different ingredient for some prep types, keyed lowercase: { ground: "Ground Beef 93/7" }. */
  byPrep?: Record<string, string>;
  category: Category;
  /** Different category for some prep types: { ground: "groundbeef" }. */
  byPrepCategory?: Record<string, Category>;
}

export interface StoreMenuSettings {
  /** Product category that marks this week's menu. */
  menuCategory: string;
  /** Product attribute names to read. */
  attributes: {
    protein: string; // "Protein"
    prep: string; // "Prep Type"
    starch: string; // "Starch" (optional)
    sides: string; // "Sides" (optional)
  };
  /** Keyed by the Protein attribute value, lowercase ("chicken", "steak"...). */
  proteinRules: Record<string, StoreProteinRule>;
}

export interface Catalog {
  businessName: string;
  batches: ProteinBatch[];
  specials: SpecialDef[];
  /** Contest Prep Protein By The Pound options. */
  contestPrep: CatalogItem[];
  /** A la carte options that aren't tied to a weekly dish (plain sides etc.). */
  alaCarte: CatalogItem[];
  /** Cooked oz per a la carte protein order. */
  alaCarteProteinOz: number;
  /** Oz per a la carte side order (counted as bulk). null = count as servings. */
  alaCarteSideOz: number | null;
  extras: ExtraDef[];
  /** Breakfast entrées and snacks: counted per item, not broken down. */
  countOnly: string[];
  /** Dishes with no meat in the base recipe (protein only via add-ons). */
  meatFree: string[];
  /** Cooked weight ÷ raw weight, per ingredient. Used for the optional raw estimate. */
  yields: Record<string, number>;
  defaultYield: number;
  /** Ordering window and delivery day. */
  orderWeek: { startsOn: number; days: number; deliveryDaysAfterEnd: number };
  store: StoreMenuSettings;
}

export interface WeeklyMenu {
  weekLabel: string;
  /** First day of the ordering week this menu was sold in (YYYY-MM-DD). Used to pick the menu automatically. */
  ordersWeekStart?: string;
  dishes: Dish[];
  /** Extra count-only items for this week (on top of catalog.countOnly). */
  countOnly?: string[];
}

// ---------- Input ----------

/** One order line, whichever way it arrived (CSV row or WooCommerce API). */
export interface OrderLine {
  orderId?: string | number;
  productId?: number;
  /** Full item name, e.g. "Greek Chicken (GF/DF) - Medium 6oz". */
  itemName: string;
  qty: number;
  /** Lowercase keys: "portions", "extras", "substitutes", "sauces", "special requests", ... */
  meta: Record<string, string>;
}

/**
 * "line-items": one row per order line (exact).
 * "summary": rows merged by product; options shown belong to one customer only.
 * "store": pulled from the WooCommerce API (exact).
 */
export type InputMode = "summary" | "line-items" | "store";

// ---------- Output ----------

export interface SizeCell {
  meals: number;
  oz: number;
}

/** One line of the top half of her sheet: e.g. C = 40 + 216 + 120 + 146 = 522 oz = 32.6 lb. */
export interface EntreeRow {
  category: Category;
  /** Dish name(s) this week. */
  dishes: string[];
  /** Ingredient + prep of the main batch, for the kitchen. */
  ingredient?: string;
  prep?: string;
  sizes: Record<Size, SizeCell>;
  /** Meals in other sizes (rare). */
  otherSizes: SizeCell;
  alaCarte: { orders: number; oz: number };
  /** "+2 oz of the same protein" add-ons. */
  extraProtein: { count: number; oz: number };
  /** Of which, from special meals (already inside the size columns). */
  fromSpecials: number;
  totalOz: number;
  totalMeals: number;
  estRawOz: number;
}

export interface ContestRow {
  item: string;
  kind: "protein" | "side";
  ingredient?: string;
  oz: number;
}

export interface AddOnRow {
  label: string;
  count: number;
  oz: number;
  /** Dish name -> count. */
  on: Record<string, number>;
}

export interface SubRow {
  sub: string;
  bySize: Record<Size, number>;
  other: number;
  total: number;
}

export interface CountRow {
  name: string;
  qty: number;
  /** Add-on text -> count (e.g. "Add Sirloin Steak": 2). */
  addOns: Record<string, number>;
}

export interface IngredientTotal {
  ingredient: string;
  cookedOz: number;
  yield: number;
  estRawOz: number;
}

export interface SideTotal {
  side: string;
  servings: number;
  /** By-the-pound side orders (a la carte), in oz. */
  bulkOz: number;
}

export interface ReviewItem {
  severity: "check" | "missing";
  message: string;
}

export interface PrepResult {
  exportMode: InputMode;
  rowsRead: number;
  rowsUsed: number;
  /** Entrée meals (incl. special-meal meals), not breakfast. */
  mealsCounted: number;
  entrees: EntreeRow[];
  contestPrep: ContestRow[];
  addOns: AddOnRow[];
  substitutions: SubRow[];
  breakfast: CountRow[];
  /** Containers to pull: entrée meals by size, plus breakfast. */
  containers: Record<Size, number> & { other: number; breakfast: number };
  /** Dish sides (servings) and a la carte sides (bulk). */
  sides: SideTotal[];
  /** Everything rolled up by ingredient, for ordering. Mixes recipes; don't cook from this. */
  byIngredient: IngredientTotal[];
  review: ReviewItem[];
}
