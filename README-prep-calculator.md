# Prepline

The public site is at `/` (pricing, terms, privacy), the tool at `/app`, settings at `/app/settings`.
The product name, contact email and links live in `src/lib/brand.ts` and `.env.example`.

## Each kitchen connects its own store

- `supabase/migrations/001_businesses.sql` creates businesses, team members, invites and store connections, with row level security so each account only sees its own kitchen. Run it once in Supabase (SQL Editor).
- The owner connects the store at `/app` with a read-only WooCommerce key. The key and secret are encrypted with `STORE_KEY_SECRET` before they're saved.
- Teammates are invited by email in Settings. They create an account with that email and are added on first login.
- Calculator settings per kitchen are presets in `src/lib/prep/presets.ts`. New kitchens get "standard". During setup, add a preset for the kitchen and map its domain in `PRESET_BY_DOMAIN`.
- A new account with no store sees the connect screen, never another kitchen's orders. (`ALLOW_ENV_STORE=true` uses the WOO_* variables for local testing only.)

## Billing

`/billing` sends people to a Stripe Payment Link (`NEXT_PUBLIC_STRIPE_PAYMENT_LINK`) with their account id as `client_reference_id`. In Stripe, set the link's after-payment redirect to `https://<domain>/billing?paid=1`. The paywall stays off until payments are matched to accounts (`REQUIRE_SUBSCRIPTION`).

---

# Weekly Prep calculator v3: pulls straight from the store

Alexandra picks the ordering week and gets the pull sheet, laid out like her paper sheet:

- **Entrées:** C, T, P, B, GB, S and PB, each with Small / Medium / Large / À la carte columns. Each column shows cooked ounces and the number of meals. Special meals are included in the size columns, and the total is in cooked lb.
- **Contest prep by the pound:** its own section, never added to the entrées.
- **Add-on proteins:** 2 oz each, tallied by protein and by the dish they were added to.
- **"+2 oz of the same protein":** counted under that dish's own category.
- **Substitutions:** shown by meal size (4 / 6 / 8 oz).
- **Breakfast & snacks:** entrée counts, with their add-ons.
- **Containers:** how many to pull, by size.
- **Check before prep:** customer notes, allergy notes, and anything the calculator had to guess.

## Files (copy into kitchen-prep-saas, same paths)

```
app/api/prep/orders/route.ts          NEW  server route: pulls a week's orders + products (logged-in, active sub only)
src/lib/woo/client.ts                 NEW  WooCommerce REST client (server only, read-only key)
src/lib/prep/types.ts                      data model
src/lib/prep/input.ts                 NEW  CSV + WooCommerce order adapters
src/lib/prep/engine.ts                     the calculation
src/lib/prep/store-menu.ts            NEW  reads this week's menu from the store's products
src/lib/prep/weeks.ts                 NEW  ordering weeks (Mon 12:00am – Sun 11:59pm, delivered Monday)
src/lib/prep/hungry-house.ts               Hungry House settings (contest list, specials, add-ons, ...)
src/components/ProteinCalculatorEmbed.tsx  the screen (same name, so app/app/page.tsx doesn't change)
src/components/prep/PrepResults.tsx   NEW  results layout
src/components/prep/pdf.ts            NEW  PDF pull sheet
src/components/prep/format.ts         NEW
scripts/test-store.ts, fixtures.ts         tests: fake store, runs the real route end to end
scripts/run-sample.ts                      runs a CSV export through the calculator
```

There are no new npm dependencies. The route uses your existing `@/src/lib/supabase-server`.

## Setup (about 5 minutes)

1. **Create a read-only API key.** In WordPress, go to WooCommerce → Settings → Advanced → REST API → Add key. Use a description like "Prep calculator" and set Permissions to **Read**. Copy the key and the secret.
2. **Add them to `.env.local`** and to your host's environment variables:
   ```
   WOO_STORE_URL=https://eathungryhouse.com
   WOO_CONSUMER_KEY=ck_...
   WOO_CONSUMER_SECRET=cs_...
   ```
   The key only ever lives on the server. The browser just calls `/api/prep/orders`.
3. Deploy, and open the app. It defaults to the week being prepped for the next Monday delivery.

## What it reads from the store (so there's no weekly setup)

Every week she already moves the new dishes into the **Current Menu** category. The calculator reads that list and then checks each product's attributes:

| Attribute | Example | Used for |
|---|---|---|
| Protein | Chicken / Turkey / Pork / Beef / Steak / Salmon / Shrimp | category + what to pull |
| Prep Type | Grilled / Shredded / Ground / Baked | Beef + Ground = **GB**; Steak/Beef + Shredded = shredding cut |
| Starch, Sides (optional) | Jasmine Rice / Zucchini | side counts |

Names with **(V)** count as plant-based. If Protein is missing, the calculator reads it from the dish name and flags it. This week that happened for **Turkey Apple Meatballs** and **Pork Fajita**, so add Protein and Prep Type to those two products. On real orders for Oct 11–17, reading the menu from the store gave exactly the same totals as the hand-saved menu.

## The new "+2 oz of the same protein" add-on

Add it to the dishes' Extras options with a label containing **"Extra Protein"**, for example `Add Extra Protein (+2oz)`. It's counted as 2 oz of that dish's own protein, in the dish's row (the "+2 oz extra" column). To use a different label, change `match` in `extras` in `hungry-house.ts`.

Existing add-ons (Add Grilled Chicken / Sirloin Steak / Shrimp) count as 2 oz each.

## Rules it follows (confirm with Alexandra)

- **Ordering week:** Monday 12:00am to Sunday 11:59pm (store time), delivered the next day (Monday). No gaps, so every order lands in a week. Pending, failed, refunded and cancelled orders are skipped. Change it in `orderWeek` in `hungry-house.ts`.
- **Special meals:** 5 = 2 chicken / 1 turkey / 2 beef, 7 = 3 / 2 turkey-or-pork / 2, 10 = 3 / 3 / 3 / 1 fish. When two dishes share a slot (beef = B + GB, turkey/pork), the meals are **split evenly**. ⚠️ Confirm that's how the kitchen fills them.
- **À la carte:** 1 lb per order (she confirmed it's by the pound).
- **Weights are cooked.** Raw is optional, shown with "Show raw estimate" and in the ordering view, using typical cooking loss. Tune `yields` after weighing a batch.

## Checked against

- **Unit tests** (`scripts/test-store.ts`, run here with a stubbed Supabase. In your project it needs a stub for `supabaseServer`). These use a fake store and run the real route: the login and subscription gates, paging, skipped statuses, the API-key fallback, the store menu, the specials split, à la carte, both add-on types, substitutions by size, breakfast, and containers.
- **Live store data, read-only:** Oct 4–10 (matches the CSV you exported) and Oct 11–17 (249 entrée meals).
- **Her handwritten sheet** didn't match any single week on the website. The contest prep matches Aug 2–8 on 4 of 9 items, but some of her amounts are half pounds, which the site can't sell. She may count orders taken outside the website. **Best test: next week she fills in her paper sheet as usual, and you compare it with the calculator.**

## CSV upload (backup)

The "Upload CSV" tab still works. A one-row-per-item export (with an Order ID column) is exact. A summary export flags add-ons and substitutions instead of counting them.

## Next steps toward the SaaS

- Store each business's store URL and API key (encrypted) in Supabase instead of env vars, with a "Connect WooCommerce" screen.
- Move `hungry-house.ts` into a per-business settings screen (contest list, specials, add-ons).
- Breakfast product totals, once she sends her breakfast list.
