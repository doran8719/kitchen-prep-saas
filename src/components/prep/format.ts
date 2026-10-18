// src/components/prep/format.ts
import { CATEGORY_LABEL, type Category } from "@/src/lib/prep/types";

export const lb = (oz: number) => (oz / 16).toFixed(1);
/** Meals can be fractional when a special's slot is split between two dishes. */
export const meals = (n: number) => (Math.abs(n - Math.round(n)) < 0.01 ? String(Math.round(n)) : n.toFixed(1));
export const oz = (n: number) => (Math.abs(n - Math.round(n)) < 0.01 ? String(Math.round(n)) : n.toFixed(1));
export const catCode = (c: Category) => CATEGORY_LABEL[c].code;
export const catName = (c: Category) => CATEGORY_LABEL[c].name;
export const shortDish = (name: string) => name.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
export const mealsLabel = (n: number) => `${meals(n)} meal${meals(n) === "1" ? "" : "s"}`;
