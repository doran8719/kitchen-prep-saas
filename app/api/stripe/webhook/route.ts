// app/api/stripe/webhook/route.ts
// Stripe calls this when someone pays, or a subscription changes or ends.
// It records Prepline subscriptions in billing_subscriptions; the paywall reads them.
//
// The Stripe account also takes Presence Media payments, so only checkouts from
// the Prepline payment link count (STRIPE_PAYMENT_LINK_ID, starts with plink_).
// Subscription changes only touch subscriptions already recorded here.

import { NextResponse } from "next/server";
import { verifyStripeSignature } from "@/src/lib/stripe-signature";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";

// The "Prepline Founding plan + setup" payment link (Stripe > Payment Links).
const PREPLINE_PAYMENT_LINK_ID = "plink_1US2pALq2MR5lEvdtBE0PwZe";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type StripeEvent = { id: string; type: string; data: { object: Record<string, unknown> } };

const str = (v: unknown) => (typeof v === "string" ? v : null);

export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }
  const obj = event.data?.object || {};
  const db = supabaseAdmin();

  try {
    if (event.type === "checkout.session.completed") {
      // Prepline's link, recognised by its ID or by where it sends people after paying.
      const linkId = process.env.STRIPE_PAYMENT_LINK_ID || PREPLINE_PAYMENT_LINK_ID;
      const successUrl = str(obj.success_url) || "";
      const fromPrepline = obj.payment_link === linkId || /getprepline\.com\/billing/.test(successUrl);
      const subscriptionId = str(obj.subscription);
      if (!fromPrepline || !subscriptionId) return NextResponse.json({ ignored: true });

      const ref = str(obj.client_reference_id);
      const details = (obj.customer_details || {}) as Record<string, unknown>;
      const { error } = await db.from("billing_subscriptions").upsert(
        {
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: str(obj.customer),
          user_id: ref && UUID.test(ref) ? ref : null,
          email: str(details.email) || str(obj.customer_email),
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" }
      );
      if (error) throw new Error(error.message);
      return NextResponse.json({ recorded: true });
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const id = str(obj.id);
      const status = event.type === "customer.subscription.deleted" ? "canceled" : str(obj.status) || "active";
      if (!id) return NextResponse.json({ ignored: true });
      const { error } = await db
        .from("billing_subscriptions")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ updated: true });
    }

    return NextResponse.json({ ignored: true });
  } catch (e) {
    // 500 makes Stripe retry later.
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
