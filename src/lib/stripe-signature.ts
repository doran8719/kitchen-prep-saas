// src/lib/stripe-signature.ts
// SERVER ONLY. Checks that a webhook really came from Stripe, using the
// endpoint's signing secret (STRIPE_WEBHOOK_SECRET, starts with whsec_).
// Same check as Stripe's library, without adding the dependency.

import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SECONDS = 5 * 60;

export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, now = Date.now()): boolean {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !sigs.length) return false;
  if (Math.abs(now / 1000 - Number(t)) > TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`, "utf8").digest();
  return sigs.some((s) => {
    const got = Buffer.from(s, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
