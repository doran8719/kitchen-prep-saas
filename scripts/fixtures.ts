// Fixture data shaped like the real store (product ids/attributes as of Oct 18).
const m = (k: string, v: string) => ({ key: k, value: v, display_key: k, display_value: v });
const li = (name: string, product_id: number, quantity: number, meta: any[]) => ({ name, product_id, quantity, meta_data: [{ key: "_reduced_stock", value: "1" }, ...meta] });
const meal = (p: string, size: string, extra: any[] = []) => [m("Portions", size), m("Special Requests", ""), ...extra];

// Real product ids/attributes from the store (Oct 18).
export const products = [
  { id: 4308, name: "Bulgogi Chicken (GF/DF)", categories: [{ id: 9, name: "Current Menu" }], attributes: [{ name: "Portions", options: ["Small 4oz", "Medium 6oz", "Large 8oz"] }, { name: "Prep Type", options: ["Shredded"] }, { name: "Protein", options: ["Chicken"] }] },
  { id: 6202, name: "Cuban Steak Bites (GF/DF)", categories: [{ id: 9, name: "Current Menu" }], attributes: [{ name: "Portions", options: ["Small 4oz"] }, { name: "Prep Type", options: ["Grilled"] }, { name: "Protein", options: ["Beef"] }] },
  { id: 3023, name: "Shepard&#8217;s Pie (GF/DF)", categories: [{ id: 9, name: "Current Menu" }], attributes: [{ name: "Portions", options: ["Small 4oz"] }, { name: "Prep Type", options: ["Ground"] }, { name: "Protein", options: ["Beef"] }] },
  { id: 4015, name: "Sweet Heat Chili Salmon (GF/DF)", categories: [{ id: 9, name: "Current Menu" }], attributes: [{ name: "Portions", options: ["Small 4oz"] }, { name: "Protein", options: ["Salmon"] }, { name: "Prep Type", options: ["Baked"] }] },
  { id: 6198, name: "Turkey Apple Meatballs (GF/DF)", categories: [{ id: 9, name: "Current Menu" }], attributes: [{ name: "Portions", options: ["Small 4oz"] }] },
  { id: 6206, name: "Pork Fajita (GF/DF)", categories: [{ id: 9, name: "Current Menu" }], attributes: [{ name: "Portions", options: ["Small 4oz"] }] },
  { id: 6211, name: "Harvest Pasta Salad (V)", categories: [{ id: 9, name: "Current Menu" }], attributes: [{ name: "Portions", options: ["Small 4oz"] }] },
  { id: 4334, name: "Yogurt Parfait", categories: [{ id: 9, name: "Current Menu" }], attributes: [{ name: "Portions", options: ["4oz", "12oz"] }] },
  { id: 2420, name: "7 Meal Special", categories: [{ id: 3, name: "Special Meals" }], attributes: [] },
  { id: 2417, name: "A La Carte Options", categories: [{ id: 4, name: "Ala Carte" }], attributes: [] },
  { id: 2418, name: "Contest Prep Protein By The Pound", categories: [{ id: 4, name: "Ala Carte" }], attributes: [] },
  { id: 5945, name: "Potato & Egg Scramble", categories: [{ id: 9, name: "Current Menu" }], attributes: [{ name: "Portions", options: ["4oz", "12oz"] }] },
  { id: 2409, name: "Cuban Black Bean Stew (GF/DF)", categories: [{ id: 1, name: "Uncategorized" }], attributes: [{ name: "Portions", options: ["Small 4oz"] }] },
];

export const orders = [
  { id: 1, status: "processing", date_created: "2026-10-12T09:00:00", line_items: [
    li("Bulgogi Chicken (GF/DF) - Medium 6oz", 4308, 4, meal("", "Medium 6oz", [m("Substitutes", "Sub Cauli Rice (GF/DF) (&#036;1.00)"), m("Extras", ""), m("Sauces", "")])),
    li("Cuban Black Bean Stew (GF/DF) - Large 8oz", 2409, 2, meal("", "Large 8oz", [m("Extras", 'Add Grilled Chicken (<span class="amount">&#36;1.50</span>)'), m("Sauces", "")])),
    li("A La Carte Options - Sweet Heat Salmon", 2417, 1, [m("A La Carte Options", "Sweet Heat Salmon"), m("Special Requests", ""), m("Vacuum Seal It", "")]),
    li("A La Carte Options - Pork Tenderloin Fajita", 2417, 2, [m("A La Carte Options", "Pork Tenderloin Fajita")]),
  ] },
  { id: 2, status: "on-hold", date_created: "2026-10-15T09:00:00", line_items: [
    li("Contest Prep Protein By The Pound", 2418, 3, [m("Protein &amp; Sides", "Grilled Chicken"), m("Portions", "1 lb")]),
    li("7 Meal Special - Medium 6oz", 2420, 1, [m("Portions", "Medium 6oz"), m("Special Requests", "no onion")]),
    li("Yogurt Parfait - 4oz", 4334, 2, meal("", "4oz")),
    li("Shepard&#8217;s Pie (GF/DF) - Large 8oz", 3023, 1, meal("", "Large 8oz", [m("Sauces", "Side of Mojo Sauce (&#036;0.90)")])),
    li("Pork Fajita (GF/DF) - Medium 6oz", 6206, 3, meal("", "Medium 6oz", [m("Extras", 'Add Extra Protein (+2oz) (<span>&#36;2.00</span>)'), m("Substitutes", "Sub Sweet Potatoes (GF/DF) (&#036;1.00)")])),
    li("Harvest Pasta Salad (V) - Small 4oz", 6211, 2, meal("", "Small 4oz", [m("Extras", "Add Grilled Chicken (&#036;1.50), Add Shrimp (&#036;2.00)")])),
    li("Potato & Egg Scramble - 4oz", 5945, 1, meal("", "4oz", [m("Extras", "Add Sirloin Steak (&#036;2.00)")])),
  ] },
  { id: 5, status: "processing", date_created: "2026-10-11T15:00:00", line_items: [li("Bulgogi Chicken (GF/DF) - Large 8oz", 4308, 9, meal("", "Large 8oz"))] },
  { id: 3, status: "pending", date_created: "2026-10-16T09:00:00", line_items: [li("Bulgogi Chicken (GF/DF) - Large 8oz", 4308, 50, meal("", "Large 8oz"))] },
  { id: 4, status: "refunded", date_created: "2026-10-16T10:00:00", line_items: [li("Bulgogi Chicken (GF/DF) - Large 8oz", 4308, 50, meal("", "Large 8oz"))] },
];

