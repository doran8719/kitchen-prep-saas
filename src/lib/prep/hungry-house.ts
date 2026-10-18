// src/lib/prep/hungry-house.ts
// Hungry House catalog + weekly menus.
// In the SaaS version this lives in the database per business and is edited
// in the app; it's a file for now so we can test against real orders.
//
// ⚠️ = guessed, needs confirming with the kitchen.

import type { Catalog, WeeklyMenu } from "./types";

export const hungryHouseCatalog: Catalog = {
  businessName: "Hungry House",

  batches: [
    // Contest prep (plain, in-house seasoning, no oil/butter)
    { id: "cp-grilled-chicken", ingredient: "Chicken Breast", prep: "Grilled – contest plain" },
    { id: "cp-pulled-chicken", ingredient: "Chicken Breast", prep: "Pulled – contest plain" },
    { id: "cp-chicken-thighs", ingredient: "Chicken Thighs", prep: "Grilled – contest plain" },
    { id: "cp-ground-chicken", ingredient: "Ground Chicken Breast", prep: "Ground – contest plain" },
    { id: "cp-ground-turkey", ingredient: "Ground Turkey 93/7", prep: "Ground – contest plain" },
    { id: "cp-ground-beef", ingredient: "Ground Beef 93/7", prep: "Ground – contest plain" },
    { id: "cp-ground-bison", ingredient: "Ground Bison", prep: "Ground – contest plain" },
    { id: "cp-sirloin", ingredient: "Sirloin Steak", prep: "Grilled – contest plain" },
    { id: "cp-salmon", ingredient: "Salmon", prep: "Baked – contest plain" },
    { id: "cp-shrimp", ingredient: "Shrimp", prep: "Baked – contest plain" },
    { id: "cp-mahi", ingredient: "Mahi Mahi", prep: "Baked – contest plain" },
    { id: "cp-cod", ingredient: "Cod", prep: "Baked – contest plain" },
    { id: "cp-ahi", ingredient: "Ahi Tuna", prep: "Seared – contest plain" },
    { id: "cp-tilapia", ingredient: "Tilapia", prep: "Baked – contest plain" },

    // Last week's dishes (week of Oct 12)
    { id: "greek-chicken", ingredient: "Chicken Breast", prep: "Greek Chicken" },
    { id: "tropi-chicken", ingredient: "Chicken Breast", prep: "Tropi-Chop Chicken" },
    { id: "turkey-taco", ingredient: "Ground Turkey 93/7", prep: "Turkey Taco" },
    { id: "chimi-pork", ingredient: "Pork Tenderloin", prep: "Chimichurri Pork" },
    { id: "mex-beef", ingredient: "Beef – shredding cut", prep: "Mexican Shredded Beef" }, // ⚠️ which cut?
    { id: "meatball-mama", ingredient: "Ground Beef 93/7", prep: "Meatball Mama meatballs" }, // store: Protein Beef, Prep Ground
    { id: "cajun-steak", ingredient: "Sirloin Steak", prep: "Cajun Steak" },
    { id: "cajun-shrimp", ingredient: "Shrimp", prep: "Cajun Shrimp (Alfredo)" },

    // This week's dishes (week of Oct 19, from the ordering page)
    { id: "shepherds-pie", ingredient: "Ground Beef 93/7", prep: "Shepherd's Pie" },
    { id: "sweet-chili-salmon", ingredient: "Salmon", prep: "Sweet Chili Salmon bites" },
    { id: "bulgogi-chicken", ingredient: "Chicken Breast", prep: "Bulgogi Chicken" },
    { id: "turkey-apple-meatballs", ingredient: "Ground Turkey 93/7", prep: "Turkey Apple Meatballs" },
    { id: "cuban-steak", ingredient: "Sirloin Steak", prep: "Cuban Steak Bites" }, // ⚠️ which cut?
    { id: "pork-fajita", ingredient: "Pork Tenderloin", prep: "Pork Fajita" },
  ],

  // From the Special Meals cards on the ordering page.
  specials: [
    { name: "5 Meal Special", mix: { chicken: 2, turkey: 1, beef: 2 } },
    { name: "7 Meal Special", mix: { chicken: 3, "turkey/pork": 2, beef: 2 } },
    { name: "10 Meal Special", mix: { chicken: 3, "turkey/pork": 3, beef: 3, fish: 1 } },
  ],

  contestPrep: [
    { name: "Grilled Chicken", protein: "cp-grilled-chicken" },
    { name: "Grilled Chicken Thighs", protein: "cp-chicken-thighs" },
    { name: "Pulled Chicken Breast", protein: "cp-pulled-chicken" },
    { name: "Fresh Ground Chicken Breast", protein: "cp-ground-chicken" },
    { name: "Ground Turkey (93/7)", protein: "cp-ground-turkey" },
    { name: "Extra Lean Ground Beef (93/7)", protein: "cp-ground-beef" },
    { name: "Ground Bison", protein: "cp-ground-bison" },
    { name: "Sirloin Steak", protein: "cp-sirloin" },
    { name: "Baked Salmon", protein: "cp-salmon" },
    { name: "Baked Shrimp", protein: "cp-shrimp" },
    { name: "Wild Caught Mahi Mahi", protein: "cp-mahi" },
    { name: "Wild Cod", protein: "cp-cod" },
    { name: "Seared Ahi Tuna", protein: "cp-ahi" },
    { name: "Tilapia Loins", protein: "cp-tilapia" },
    { name: "Jasmine Rice", side: "Jasmine Rice" },
    { name: "Basmati Rice", side: "Basmati Rice" },
    { name: "Brown Rice", side: "Brown Rice" },
    { name: "Quinoa", side: "Quinoa" },
    { name: "Cauliflower Rice", side: "Cauliflower Rice" },
    { name: "Roasted Potatoes", side: "Roasted Potatoes" },
    { name: "Sweet Roasted Potatoes", side: "Sweet Potatoes" },
    { name: "Pasture Raised Hard Boiled Eggs", side: "Hard Boiled Eggs" },
  ],

  // A la carte sides. A la carte proteins match this week's dishes instead.
  alaCarte: [
    { name: "Mexican Rice", side: "Mexican Rice" },
    { name: "Wild Rice", side: "Wild Rice" },
    { name: "Spanish Rice", side: "Spanish Rice" },
    { name: "Jasmine Rice", side: "Jasmine Rice" },
    { name: "Steamed Fajitas", side: "Fajita Peppers" },
    { name: "Steamed Green Beans", side: "Green Beans" },
    { name: "Steamed Asparagus", side: "Asparagus" },
    { name: "Steamed Broccoli", side: "Broccoli" },
    { name: "Steamed Zucchini", side: "Zucchini" },
    { name: "Sweet Baked Plantains", side: "Sweet Baked Plantains" },
  ],

  // A la carte is sold by the pound (Alexandra: "those that are just ordering by the pound").
  alaCarteProteinOz: 16,
  alaCarteSideOz: 16,

  // All add-ons are 2 oz (confirmed by Kyle, Oct 18).
  extras: [
    // The new "more of the same protein" add-on. Matches any Extras option containing this text.
    { match: "Extra Protein", protein: "same", label: "Extra protein (same as dish)", oz: 2 },
    { match: "Add Grilled Chicken", protein: "cp-grilled-chicken", label: "Grilled chicken", oz: 2 },
    { match: "Add Chicken", protein: "cp-grilled-chicken", label: "Grilled chicken", oz: 2 },
    { match: "Add Sirloin Steak", protein: "cp-sirloin", label: "Sirloin steak", oz: 2 },
    { match: "Add Steak", protein: "cp-sirloin", label: "Sirloin steak", oz: 2 },
    { match: "Add Shrimp", protein: "cp-shrimp", label: "Shrimp", oz: 2 },
  ],

  // ⚠️ Starting estimates (cooked ÷ raw). Weigh one batch raw and cooked to set real numbers.
  yields: {
    "Chicken Breast": 0.75,
    "Chicken Thighs": 0.7,
    "Ground Chicken Breast": 0.75,
    "Ground Turkey 93/7": 0.75,
    "Ground Beef 93/7": 0.75,
    "Ground Bison": 0.75,
    "Sirloin Steak": 0.75,
    "Pork Tenderloin": 0.75,
    "Beef – shredding cut": 0.6,
    Salmon: 0.8,
    Shrimp: 0.85,
    "Mahi Mahi": 0.8,
    Cod: 0.8,
    "Ahi Tuna": 0.9,
    Tilapia: 0.8,
  },
  defaultYield: 0.75,

  // Breakfast, snacks, desserts, sauces: counted, not broken down.
  countOnly: [
    "Yogurt Parfait",
    "Protein Pancakes & Chicken Sausage",
    "Protein Pancakes & Scrambled Eggs",
    "Powerhouse Breakfast Duo",
    "Potato & Egg Scramble",
    "Bacon Gouda Egg Bite",
    "Red Pepper Egg White Bite",
    "Monster Bites",
    "Classic Chocolate Chip",
    "HungryChurri",
    "Gift Card",
  ],

  meatFree: ["Cuban Black Bean Stew"],

  // Orders count Monday 12:00am – Sunday 11:59pm (no gaps, so nothing falls through),
  // delivered the next day, Monday ("Menu week of 10/12-10/16, delivery on Monday 10/19").
  orderWeek: { startsOn: 1, days: 7, deliveryDaysAfterEnd: 1 },

  // How to read the menu from the store's products.
  store: {
    menuCategory: "Current Menu",
    attributes: { protein: "Protein", prep: "Prep Type", starch: "Starch", sides: "Sides" },
    proteinRules: {
      chicken: { ingredient: "Chicken Breast", byPrep: { ground: "Ground Chicken Breast" }, category: "chicken" },
      turkey: { ingredient: "Ground Turkey 93/7", category: "turkey" },
      pork: { ingredient: "Pork Tenderloin", category: "pork" },
      beef: {
        ingredient: "Sirloin Steak",
        byPrep: { ground: "Ground Beef 93/7", shredded: "Beef – shredding cut" },
        category: "beef",
        byPrepCategory: { ground: "groundbeef" },
      },
      steak: {
        ingredient: "Sirloin Steak",
        byPrep: { ground: "Ground Beef 93/7", shredded: "Beef – shredding cut" },
        category: "beef",
        byPrepCategory: { ground: "groundbeef" },
      },
      salmon: { ingredient: "Salmon", category: "seafood" },
      shrimp: { ingredient: "Shrimp", category: "seafood" },
      tilapia: { ingredient: "Tilapia", category: "seafood" },
      cod: { ingredient: "Cod", category: "seafood" },
      "mahi mahi": { ingredient: "Mahi Mahi", category: "seafood" },
      mahi: { ingredient: "Mahi Mahi", category: "seafood" },
      tuna: { ingredient: "Ahi Tuna", category: "seafood" },
      fish: { ingredient: "Fish", category: "seafood" },
    },
  },
};

/** Week of Oct 12 (orders Oct 5-10). Matches the sample export. Sides unknown, so not listed. */
export const weekOfOct12: WeeklyMenu = {
  weekLabel: "Week of Oct 12, 2026",
  ordersWeekStart: "2026-10-05",
  dishes: [
    { name: "Greek Chicken", category: "chicken", protein: "greek-chicken" },
    { name: "Tropi-Chop Chicken", category: "chicken", protein: "tropi-chicken", slots: [] }, // older dish, 1 sold
    { name: "Turkey Taco", category: "turkey", protein: "turkey-taco" },
    { name: "Chimichurri Pork Tenderloin", category: "pork", protein: "chimi-pork" },
    { name: "Mexican Shredded Beef", category: "beef", protein: "mex-beef" },
    { name: "Meatball Mama", category: "groundbeef", protein: "meatball-mama" },
    { name: "Cajun Steak & Rice", category: "beef", protein: "cajun-steak", slots: [] }, // older dish, 1 sold
    { name: "Cajun Shrimp Alfredo", category: "seafood", protein: "cajun-shrimp" },
    { name: "Cuban Black Bean Stew", category: "plant" }, // protein only via add-ons
  ],
};

/** Week of Oct 19 (orders Oct 12-17). From her printed menu. */
export const weekOfOct19: WeeklyMenu = {
  weekLabel: "Week of Oct 19, 2026",
  ordersWeekStart: "2026-10-12",
  dishes: [
    { name: "Shepard's Pie", category: "groundbeef", protein: "shepherds-pie", starch: "Mashed Potatoes", sides: ["Green Beans"] },
    { name: "Sweet Heat Chili Salmon", aliases: ["Sweet Heat Salmon"], category: "seafood", protein: "sweet-chili-salmon", starch: "Jasmine Rice", sides: ["Broccoli"] },
    { name: "Bulgogi Chicken", category: "chicken", protein: "bulgogi-chicken", starch: "Jasmine Rice", sides: ["Zucchini"] },
    { name: "Turkey Apple Meatballs", category: "turkey", protein: "turkey-apple-meatballs", starch: "Sweet Potatoes", sides: ["Green Beans"] },
    { name: "Cuban Steak Bites", category: "beef", protein: "cuban-steak", starch: "Jasmine Rice", sides: ["Sweet Baked Plantains"] },
    { name: "Pork Fajita", aliases: ["Pork Tenderloin Fajita"], category: "pork", protein: "pork-fajita", starch: "Cilantro Lime Rice", sides: ["Fajita Peppers"] },
    { name: "Harvest Pasta Salad", category: "plant" },
  ],
};

/** Hand-saved menus. Optional: the calculator can also read the menu from the store. */
export const savedMenus: WeeklyMenu[] = [weekOfOct19, weekOfOct12];
