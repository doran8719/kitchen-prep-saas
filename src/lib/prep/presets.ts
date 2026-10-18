// src/lib/prep/presets.ts
// Each business uses one preset: its calculator settings (sizes, meal packs,
// add-ons, bulk items, store rules). New kitchens start on "standard"; during
// setup we add a preset for them here and map their store's domain to it.

import type { Catalog, StoreMenuSettings, WeeklyMenu } from "./types";
import { hungryHouseCatalog, savedMenus as hungryHouseMenus } from "./hungry-house";

export interface Preset {
  catalog: Catalog;
  savedMenus: WeeklyMenu[];
}

const standardStore: StoreMenuSettings = {
  menuCategory: "Current Menu",
  attributes: { protein: "Protein", prep: "Prep Type", starch: "Starch", sides: "Sides" },
  proteinRules: {
    chicken: { ingredient: "Chicken Breast", byPrep: { ground: "Ground Chicken" }, category: "chicken" },
    turkey: { ingredient: "Ground Turkey", category: "turkey" },
    pork: { ingredient: "Pork", category: "pork" },
    beef: {
      ingredient: "Steak",
      byPrep: { ground: "Ground Beef", shredded: "Beef – shredding cut" },
      category: "beef",
      byPrepCategory: { ground: "groundbeef" },
    },
    steak: {
      ingredient: "Steak",
      byPrep: { ground: "Ground Beef", shredded: "Beef – shredding cut" },
      category: "beef",
      byPrepCategory: { ground: "groundbeef" },
    },
    salmon: { ingredient: "Salmon", category: "seafood" },
    shrimp: { ingredient: "Shrimp", category: "seafood" },
    tilapia: { ingredient: "Tilapia", category: "seafood" },
    cod: { ingredient: "Cod", category: "seafood" },
    mahi: { ingredient: "Mahi Mahi", category: "seafood" },
    "mahi mahi": { ingredient: "Mahi Mahi", category: "seafood" },
    tuna: { ingredient: "Tuna", category: "seafood" },
    fish: { ingredient: "Fish", category: "seafood" },
  },
};

/** A sensible start for a kitchen we haven't set up yet. */
export const standardCatalog: Catalog = {
  businessName: "Your kitchen",
  batches: [],
  specials: [],
  contestPrep: [],
  alaCarte: [],
  alaCarteProteinOz: 16,
  alaCarteSideOz: 16,
  extras: [{ match: "Extra Protein", protein: "same", label: "Extra protein (same as dish)", oz: 2 }],
  countOnly: [],
  meatFree: [],
  yields: {
    "Chicken Breast": 0.75,
    "Ground Chicken": 0.75,
    "Ground Turkey": 0.75,
    "Ground Beef": 0.75,
    Steak: 0.75,
    Pork: 0.75,
    "Beef – shredding cut": 0.6,
    Salmon: 0.8,
    Shrimp: 0.85,
  },
  defaultYield: 0.75,
  orderWeek: { startsOn: 1, days: 7, deliveryDaysAfterEnd: 1 },
  store: standardStore,
};

export const PRESETS: Record<string, Preset> = {
  standard: { catalog: standardCatalog, savedMenus: [] },
  "hungry-house": { catalog: hungryHouseCatalog, savedMenus: hungryHouseMenus },
};

/** Store domains we've set up a preset for. */
const PRESET_BY_DOMAIN: Record<string, string> = {
  "eathungryhouse.com": "hungry-house",
};

export function presetForStoreUrl(storeUrl: string): string {
  try {
    const host = new URL(storeUrl).hostname.replace(/^www\./, "");
    return PRESET_BY_DOMAIN[host] || "standard";
  } catch {
    return "standard";
  }
}

/** The preset's settings, with the business's own name and menu category. */
export function presetFor(key: string | null | undefined, opts: { businessName?: string; menuCategory?: string | null } = {}): Preset {
  const p = PRESETS[key || "standard"] || PRESETS.standard;
  return {
    savedMenus: p.savedMenus,
    catalog: {
      ...p.catalog,
      businessName: opts.businessName || p.catalog.businessName,
      store: { ...p.catalog.store, menuCategory: opts.menuCategory || p.catalog.store.menuCategory },
    },
  };
}
