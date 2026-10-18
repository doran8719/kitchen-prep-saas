// app/privacy/page.tsx
// Plain-language starting point. Have a lawyer review before relying on it.
import type { Metadata } from "next";
import LegalPage from "@/src/components/site/LegalPage";
import { BRAND } from "@/src/lib/brand";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  const b = BRAND.name;
  return (
    <LegalPage title="Privacy policy" updated="October 18, 2026">
      <p>
        This explains what {b}, run by {BRAND.legalEntity}, collects and what we do with it. The short version: we read
        only what&apos;s needed to count your orders, and we don&apos;t sell anything to anyone.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <b>Your account:</b> your email address and a password (stored by our login provider, never in plain text).
        </li>
        <li>
          <b>Your store connection:</b> your store address and a read-only API key, stored encrypted.
        </li>
        <li>
          <b>Order details:</b> for each order, its number, date, status and the items ordered with their options (size,
          add-ons, swaps). We don&apos;t request your customers&apos; names, emails, phone numbers or addresses.
        </li>
        <li>
          <b>Products:</b> names, categories and attributes such as protein and prep type.
        </li>
        <li>
          <b>Your settings:</b> meal sizes, meal packs, add-ons and similar.
        </li>
        <li>
          <b>Payments:</b> handled by Stripe. We see your plan and payment status, not your card number.
        </li>
      </ul>
      <p>
        If you upload a CSV export, it&apos;s read in your browser to build the sheet. Customer notes on orders can
        contain whatever a customer typed. We show them on your sheet so the kitchen sees allergy notes, and don&apos;t
        use them for anything else.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To build your prep sheets and run the service.</li>
        <li>To email you about your account, billing and changes to the service.</li>
        <li>To fix problems, with your permission when it means looking at your data.</li>
      </ul>
      <p>We don&apos;t sell your data, share it with advertisers, or use it to train AI models.</p>

      <h2>Who else handles it</h2>
      <p>
        We use a small number of providers to run {b}: Supabase (accounts and database), Vercel (hosting) and Stripe
        (payments). They process data only on our behalf.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Order details are fetched when you build a sheet and aren&apos;t stored long term. Your account, settings and
        store connection are kept while your account is open. Ask us and we&apos;ll delete them within 30 days of you
        closing your account.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Delete the API key in WooCommerce at any time and {b} can no longer read your store.</li>
        <li>Ask us for a copy of your data, or to correct or delete it.</li>
      </ul>

      <h2>Cookies</h2>
      <p>We use only the cookies needed to keep you logged in. No advertising or tracking cookies.</p>

      <h2>Contact</h2>
      <p>
        Privacy questions or requests:{" "}
        <a href={`mailto:${BRAND.contactEmail}`} className="underline underline-offset-2">
          {BRAND.contactEmail}
        </a>
        .
      </p>
    </LegalPage>
  );
}
