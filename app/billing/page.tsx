// app/billing/page.tsx
// Subscribing goes through a Stripe Payment Link (no server code needed).
// Set NEXT_PUBLIC_STRIPE_PAYMENT_LINK, and in Stripe set the link's
// "After payment" redirect to  https://<your-domain>/billing?paid=1
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/src/lib/supabase-browser";
import { Wordmark } from "@/src/components/site/SiteChrome";
import { BRAND, PLANS, SETUP_FEE, demoHref } from "@/src/lib/brand";

export default function BillingPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    setPaid(new URLSearchParams(window.location.search).get("paid") === "1");
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) setUser({ id: u.id, email: u.email ?? undefined });
    });
  }, [supabase]);

  // Stripe Payment Links accept these, so the payment can be matched to this account.
  const checkoutUrl = useMemo(() => {
    if (!BRAND.paymentLink) return "";
    const url = new URL(BRAND.paymentLink);
    if (user) url.searchParams.set("client_reference_id", user.id);
    if (user?.email) url.searchParams.set("prefilled_email", user.email);
    return url.toString();
  }, [user]);

  const plan = PLANS[0];

  return (
    <div className="flex min-h-screen flex-col bg-steel px-4 py-6 text-ink">
      <div className="mx-auto flex w-full max-w-lg items-center justify-between">
        <Link href="/" className="text-xl" aria-label="Home">
          <Wordmark />
        </Link>
        {user && (
          <Link href="/app" className="text-sm font-semibold hover:underline">
            Back to the app
          </Link>
        )}
      </div>

      <main className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-lg bg-paper px-6 py-8 shadow-[0_18px_40px_-22px_rgba(27,36,48,0.45)] sm:px-8">
          {paid ? (
            <>
              <h1 className="wide text-3xl font-extrabold tracking-tight">Payment received</h1>
              <p className="mt-4 leading-relaxed text-ink-soft">
                Thanks. We&apos;ll email you within one business day to book your setup call. Stripe has sent your
                receipt.
              </p>
              <Link
                href={user ? "/app" : "/login"}
                className="mt-8 inline-block rounded-md bg-ink px-5 py-3 font-semibold text-paper hover:bg-monday-deep"
              >
                {user ? "Go to the app" : "Log in"}
              </Link>
            </>
          ) : (
            <>
              <h1 className="wide text-3xl font-extrabold tracking-tight">{plan.name} plan</h1>
              <p className="mt-2 text-ink-soft">{plan.note}</p>

              <dl className="tnum mt-6 space-y-3 text-lg">
                <div className="flex items-baseline gap-3">
                  <dt className="font-semibold">Monthly</dt>
                  <span className="leader" aria-hidden="true" />
                  <dd className="font-bold">${plan.price}</dd>
                </div>
                <div className="flex items-baseline gap-3">
                  <dt className="font-semibold">Setup, once</dt>
                  <span className="leader" aria-hidden="true" />
                  <dd className="font-bold">${SETUP_FEE}</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                Cancel any time. Setup covers entering your menu with you and checking your first week against your own
                count.
              </p>

              {checkoutUrl ? (
                <a
                  href={checkoutUrl}
                  className="mt-8 block rounded-md bg-ink px-5 py-3 text-center font-semibold text-paper hover:bg-monday-deep"
                >
                  Subscribe with Stripe
                </a>
              ) : (
                <div className="mt-8 rounded-md bg-steel px-4 py-3 text-sm leading-relaxed">
                  Online checkout isn&apos;t open yet.{" "}
                  <a href={demoHref()} className="font-semibold underline underline-offset-2">
                    Book a setup call
                  </a>{" "}
                  and we&apos;ll get you started.
                </div>
              )}

              {BRAND.billingPortal && (
                <p className="mt-4 text-center text-sm">
                  Already subscribed?{" "}
                  <a href={BRAND.billingPortal} className="font-semibold underline underline-offset-2">
                    Update your card or cancel
                  </a>
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
