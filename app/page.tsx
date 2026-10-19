// app/page.tsx
// Public homepage. The tool itself lives at /app.

import Link from "next/link";
import PullSheet from "@/src/components/site/PullSheet";
import { SiteFooter, SiteHeader } from "@/src/components/site/SiteChrome";
import { BRAND, PLANS, SETUP_FEE, demoHref } from "@/src/lib/brand";

const COUNTS = [
  ["Prep type", "Ground beef and steak are separate pulls. So are grilled and shredded chicken."],
  ["Meal sizes", "Small, medium and large meals at your portion weights, plus à la carte by the pound."],
  ["Meal packs", "5, 7 and 10 meal specials, split into the dishes that fill them."],
  ["Add-ons", "Extra protein and add-a-protein options, counted at the weight you serve."],
  ["Swaps", "Substitutions, counted by meal size."],
  ["Bulk orders", "Contest prep and other by-the-pound orders, kept off the entrée lines."],
  ["Breakfast and snacks", "Counted on their own, with their add-ons."],
  ["Containers", "How many of each size to pull."],
  ["Anything odd", "Allergy notes, customer notes and anything it had to guess, listed for you to check."],
] as const;

const STEPS = [
  [
    "Connect your store",
    "You give Prepline read-only access to your store's orders. It can't change anything, and it doesn't read customer names or addresses.",
  ],
  [
    "Set up your menu once",
    "On a call, we enter your sizes, meal packs, add-ons and bulk items. After that, it reads each week's dishes from your store.",
  ],
  [
    "Print the sheet",
    "Pick the ordering week. The sheet is on screen in a few seconds, and as a PDF to print for the kitchen.",
  ],
] as const;

const FAQ = [
  [
    "Which stores does it work with?",
    "WooCommerce connects directly. Custom-built sites connect through our order feed, which your developer can add in about an hour. On Shopify, Square or something else? You can upload a weekly order export from day one, and we connect your store during setup.",
  ],
  [
    "What about orders taken over the phone?",
    "Enter them through your own store's checkout, with a pay-later or invoice option, and they're counted with everything else. You can also upload a CSV of extra orders.",
  ],
  [
    "Are the weights raw or cooked?",
    "Cooked, because that's what goes in the container. You can also see a raw estimate for ordering, based on your own cooking yields.",
  ],
  [
    "Can Prepline change anything in my store?",
    "No. Its access is read-only, and you can revoke it in your store at any time.",
  ],
  ["Is there a contract?", "No. Plans are monthly and you can cancel any time. The setup fee is paid once."],
] as const;

export default function Home() {
  const founding = PLANS[0];

  return (
    <div className="min-h-screen bg-steel text-ink">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-20 pt-8 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:pb-28 lg:pt-14">
          <div>
            <h1 className="wide text-[2.6rem] font-extrabold leading-[0.98] tracking-tight sm:text-6xl">
              Your weekly prep sheet, counted for you.
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-soft">
              {BRAND.name} reads the week&apos;s orders from your online store and tells you how much of each
              protein to pull, split by how it&apos;s prepped and by meal size. The tally that takes an afternoon with
              a calculator takes about a minute.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={demoHref()}
                className="rounded-md bg-ink px-5 py-3 text-base font-semibold text-paper hover:bg-monday-deep"
              >
                Run my orders free
              </a>
              <Link href="/login" className="rounded-md px-4 py-3 text-base font-semibold hover:bg-steel-deep/60">
                Log in
              </Link>
            </div>
            <p className="mt-4 max-w-[30rem] text-sm text-ink-soft">
              Send us last week&apos;s orders and we&apos;ll send back your prep sheet. Check it against your own count
              before you pay anything.
            </p>
          </div>

          <PullSheet />
        </section>

        {/* What it counts */}
        <section className="bg-paper">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-8 lg:grid-cols-[1fr_2fr] lg:py-24">
            <div>
              <h2 className="wide text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                The parts that make it take all afternoon
              </h2>
              <p className="mt-4 max-w-[26rem] leading-relaxed text-ink-soft">
                Totalling protein is easy. Splitting it the way the kitchen actually cooks it is what takes the time.
                {" "}
                {BRAND.name} handles all of this:
              </p>
            </div>
            <dl className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {COUNTS.map(([term, text]) => (
                <div key={term} className="border-t-2 border-ink pt-3">
                  <dt className="text-lg font-bold">{term}</dt>
                  <dd className="mt-1 leading-relaxed text-ink-soft">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-8 lg:py-24">
          <h2 className="wide text-3xl font-extrabold tracking-tight sm:text-4xl">How it works</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title}>
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-monday text-lg font-extrabold text-paper"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <h3 className="mt-4 text-xl font-bold">{title}</h3>
                <p className="mt-2 max-w-[22rem] leading-relaxed text-ink-soft">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Where it came from */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-8 lg:pb-24">
          <div className="grid gap-8 border-y-2 border-ink py-10 md:grid-cols-[auto_1fr] md:items-center md:gap-14">
            <p className="wide tnum text-6xl font-extrabold leading-none tracking-tight sm:text-7xl">
              5–6 hrs
            </p>
            <p className="max-w-[40rem] text-lg leading-relaxed">
              That&apos;s how long the owner of Hungry House, a meal prep kitchen, spent every week turning orders into
              a prep sheet by hand. {BRAND.name} was built in her kitchen, around the sheet she already used, and
              checked against her own counts.
            </p>
          </div>
        </section>

        {/* Pricing: a menu board */}
        <section id="pricing" className="scroll-mt-6 bg-ink text-paper">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 sm:px-8 lg:grid-cols-[1fr_1.4fr] lg:py-24">
            <div>
              <h2 className="wide text-3xl font-extrabold tracking-tight sm:text-4xl">Pricing</h2>
              <p className="mt-4 max-w-[26rem] leading-relaxed text-paper/70">
                One kitchen, one store, monthly. Setup is a one-time fee: we enter your menu with you and check your
                first week against your own count.
              </p>
              <a
                href={demoHref()}
                className="mt-8 inline-block rounded-md bg-paper px-5 py-3 font-semibold text-ink hover:bg-tape"
              >
                Run my orders free
              </a>
            </div>

            <div className="tnum">
              <ul className="space-y-7">
                {PLANS.map((p) => (
                  <li key={p.name}>
                    <div className="flex items-baseline gap-3 text-xl font-bold sm:text-2xl">
                      <span>{p.name}</span>
                      <span className="leader" aria-hidden="true" />
                      <span>
                        ${p.price}
                        <span className="text-base font-semibold text-paper/70"> /month</span>
                      </span>
                    </div>
                    <p className="mt-1 text-paper/70">
                      {p.note} {p.includes}.
                    </p>
                    {p.name === founding.name && (
                      <p className="mt-2 inline-block bg-tape px-2 py-0.5 font-marker text-ink">Open now</p>
                    )}
                  </li>
                ))}
                <li className="border-t border-paper/20 pt-7">
                  <div className="flex items-baseline gap-3 text-xl font-bold sm:text-2xl">
                    <span>Setup, once</span>
                    <span className="leader" aria-hidden="true" />
                    <span>${SETUP_FEE}</span>
                  </div>
                  <p className="mt-1 text-paper/70">Your menu, sizes, meal packs and add-ons, entered and checked with you.</p>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Questions */}
        <section className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-8 lg:py-24">
          <h2 className="wide text-3xl font-extrabold tracking-tight sm:text-4xl">Questions</h2>
          <div className="mt-8 divide-y-2 divide-steel-deep border-y-2 border-steel-deep">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-bold [&::-webkit-details-marker]:hidden">
                  {q}
                  <span
                    className="text-2xl font-normal leading-none text-monday transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-[38rem] leading-relaxed text-ink-soft">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Last call */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-8">
          <div className="bg-paper px-6 py-12 sm:px-12">
            <h2 className="wide max-w-[40rem] text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              See your own week before you decide.
            </h2>
            <p className="mt-4 max-w-[36rem] text-lg leading-relaxed text-ink-soft">
              Book a 20-minute call or send us last week&apos;s order export. We&apos;ll run it and send you the prep
              sheet, free.
            </p>
            <a
              href={demoHref()}
              className="mt-8 inline-block rounded-md bg-ink px-5 py-3 font-semibold text-paper hover:bg-monday-deep"
            >
              Run my orders free
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
