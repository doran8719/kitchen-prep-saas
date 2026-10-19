// src/lib/brand.ts
// Everything that names the product or links out lives here, so a rename or a
// new booking link is a one-line change.

export const BRAND = {
  name: "Prepline",
  /** Who runs the service, for the legal pages. */
  legalEntity: "Presence Media",
  /** Public site address. */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.getprepline.com",
  /** Shown in the footer and legal pages. Forwards to Kyle's inbox (ImprovMX). */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@getprepline.com",
  /** "Run my orders free" goes here: the Calendly booking page. */
  demoUrl: process.env.NEXT_PUBLIC_DEMO_URL || "https://calendly.com/getprepline/20min",
  /** Stripe Payment Link for the Founding plan ($499 setup + $99/mo). */
  paymentLink: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/4gMfZigzIdZ9baJ4eH3F602",
  /** Stripe's hosted page where customers update their card or cancel. */
  billingPortal: process.env.NEXT_PUBLIC_STRIPE_PORTAL_LINK || "",
};

export function demoHref() {
  return BRAND.demoUrl || `mailto:${BRAND.contactEmail}?subject=${encodeURIComponent("Run my orders through " + BRAND.name)}`;
}

export const PLANS = [
  { name: "Founding", price: 99, note: "First 10 kitchens. Price locked for 12 months.", includes: "Everything in Standard, in exchange for feedback" },
  { name: "Standard", price: 149, note: "One kitchen, one store.", includes: "Store connection, weekly prep sheet and printable PDF" },
  { name: "Managed", price: 249, note: "We keep it set up for you.", includes: "Standard, plus we update your menu setup each week and help with phone orders" },
] as const;

export const SETUP_FEE = 499;
