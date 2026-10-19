// app/docs/order-feed/page.tsx
// Public guide for developers: how a custom site shares its orders with Prepline.
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/src/components/site/SiteChrome";
import { BRAND } from "@/src/lib/brand";

export const metadata: Metadata = {
  title: "Order feed guide",
  description: "How a custom-built store shares its weekly orders with Prepline.",
};

const EXAMPLE = `{
  "orders": [
    {
      "id": "1042",
      "status": "paid",
      "createdAt": "2026-10-12T09:41:00-06:00",
      "items": [
        {
          "productId": "bulgogi-chicken",
          "name": "Bulgogi Chicken",
          "size": "Medium 6oz",
          "quantity": 2,
          "options": { "Extras": "Extra Protein (+2oz)", "Substitutes": "Sweet potato" },
          "note": "No sesame, allergy"
        },
        {
          "name": "7 Meal Special",
          "size": "Large 8oz",
          "quantity": 1
        }
      ]
    }
  ],
  "products": [
    {
      "id": "bulgogi-chicken",
      "name": "Bulgogi Chicken",
      "categories": ["Current Menu"],
      "protein": "Chicken",
      "prepType": "Grilled",
      "starch": "Jasmine Rice",
      "sides": ["Broccoli"]
    }
  ],
  "next": null
}`;

const NEXT_ROUTE = `// app/api/prepline/orders/route.ts  (Next.js example)
import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // your database

export async function GET(req: Request) {
  // 1) Only Prepline, holding your key, may read this.
  const auth = req.headers.get("authorization") || "";
  if (auth !== \`Bearer \${process.env.PREPLINE_FEED_KEY}\`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2) Orders placed from..to (inclusive), in your store's time zone.
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // "2026-10-12"
  const to = searchParams.get("to");     // "2026-10-18"
  const orders = await db.orders.findBetween(from, to);

  // 3) Answer in Prepline's format. No customer names, emails or addresses.
  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.paid ? "paid" : o.status,
      createdAt: o.createdAt.toISOString(), // or with your local offset
      items: o.items.map((i) => ({
        productId: i.productId,
        name: i.productName,
        size: i.sizeLabel,
        quantity: i.quantity,
        options: i.options,
        note: i.note,
      })),
    })),
    products: await db.products.forPrepline(),
  });
}`;

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-ink p-4 text-[13px] leading-relaxed text-paper">
      <code>{children}</code>
    </pre>
  );
}

const ROWS: [string, string, string][] = [
  ["id", "Required", "Your order number."],
  ["status", "Required", "paid, processing, completed or on-hold are cooked. Anything else (pending, refunded, cancelled) is skipped."],
  ["createdAt", "Required", "When it was ordered, ISO 8601. Use your store's local offset, so the date part is your local date."],
  ["items[].name", "Required", "The dish or product name, as on your menu."],
  ["items[].size", "Recommended", 'The meal size the customer picked, with ounces: "Small 4oz", "Medium 6oz", "Large 8oz".'],
  ["items[].quantity", "Required", "How many."],
  ["items[].productId", "Recommended", "Matches products[].id, so renaming a dish doesn't break anything."],
  ["items[].options", "Optional", 'Other choices: { "Extras": "...", "Substitutes": "...", "Sauces": "..." }.'],
  ["items[].note", "Optional", "Customer notes. Shown on the sheet, so allergy notes reach the kitchen."],
  ["products[]", "Recommended", "Your current dishes, with protein and prepType, so Prepline knows what to pull. Tag this week's dishes with a category such as \"Current Menu\"."],
  ["next", "Optional", "If there are many orders, a link to the next page on the same site. Prepline follows it."],
];

export default function OrderFeedGuide() {
  return (
    <div className="min-h-screen bg-steel text-ink">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:px-8">
        <div className="bg-paper px-6 py-10 sm:px-12 sm:py-14">
          <h1 className="wide text-4xl font-extrabold tracking-tight">Order feed guide</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            {BRAND.name} reads WooCommerce stores directly. Any other site, whether custom-built, headless or anything
            else, can share its orders through one private address. This page is for whoever builds your site. Adding it
            usually takes about an hour.
          </p>

          <div className="mt-10 space-y-4 leading-relaxed [&_h2]:pt-6 [&_h2]:text-2xl [&_h2]:font-bold [&_code]:font-mono [&_p_code]:break-all [&_li_code]:break-all">
            <h2>How it works</h2>
            <p>
              Your site adds one address, for example <code>https://yourkitchen.com/api/prepline/orders</code>. When the
              kitchen opens the prep sheet, {BRAND.name} asks it for a week of orders:
            </p>
            <Code>{`GET https://yourkitchen.com/api/prepline/orders?from=2026-10-12&to=2026-10-18
Authorization: Bearer <your feed key>`}</Code>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <b>from</b> and <b>to</b> are dates in your store&apos;s time zone. Include every order placed on those
                days, the last day included.
              </li>
              <li>
                <b>The feed key</b> is a long random password you make (at least 16 characters, for example from{" "}
                <code>openssl rand -hex 24</code>). Store it on your site, check it on every request, and paste the same
                key into {BRAND.name}. Reject anything without it.
              </li>
              <li>Only answer over https. {BRAND.name} only reads; the address never changes anything.</li>
            </ul>

            <h2>What to send back</h2>
            <p>JSON, in this shape:</p>
            <Code>{EXAMPLE}</Code>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-ink">
                    <th className="py-2 pr-3">Field</th>
                    <th className="py-2 pr-3"> </th>
                    <th className="py-2">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map(([f, need, text]) => (
                    <tr key={f} className="border-b border-steel-deep align-top">
                      <td className="py-2 pr-3 font-mono">{f}</td>
                      <td className="py-2 pr-3 text-ink-soft">{need}</td>
                      <td className="py-2">{text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2>Privacy</h2>
            <p>
              Don&apos;t send customer names, emails, phone numbers or addresses. {BRAND.name} doesn&apos;t need them to
              count what to cook.
            </p>

            <h2>Example</h2>
            <p>A minimal version for a Next.js site. Other frameworks work the same way.</p>
            <Code>{NEXT_ROUTE}</Code>

            <h2>Connecting it</h2>
            <p>
              In {BRAND.name}, the kitchen owner goes to <b>Connect your store → Custom site</b> and pastes the feed
              address and key. {BRAND.name} requests the last seven days to check the feed answers before saving.
            </p>
            <p>
              Questions:{" "}
              <a href={`mailto:${BRAND.contactEmail}`} className="underline underline-offset-2">
                {BRAND.contactEmail}
              </a>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
