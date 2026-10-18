// app/terms/page.tsx
// Plain-language starting point. Have a lawyer review before relying on it.
import type { Metadata } from "next";
import LegalPage from "@/src/components/site/LegalPage";
import { BRAND, SETUP_FEE } from "@/src/lib/brand";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  const b = BRAND.name;
  return (
    <LegalPage title="Terms of service" updated="October 18, 2026">
      <p>
        These terms cover your use of {b}, a service run by {BRAND.legalEntity} (&quot;we&quot;). By creating an
        account or paying for a plan, you agree to them.
      </p>

      <h2>What {b} does</h2>
      <p>
        {b} reads orders and products from your online store and produces a prep sheet: how much of each item to
        prepare for an ordering week. It&apos;s a planning tool. You remain responsible for what your kitchen cooks,
        how it&apos;s portioned and labelled, and for food safety and allergen handling.
      </p>

      <h2>Accuracy</h2>
      <p>
        The sheet is only as accurate as the orders, products and settings it reads. Orders taken outside your store,
        products missing their details, or settings that don&apos;t match how your kitchen fills orders will change
        the numbers. {b} lists what it couldn&apos;t work out for you to check. Please check the sheet before you buy or
        cook, especially in your first weeks. We aren&apos;t liable for over- or under-production, food cost or lost
        sales.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your login to yourself and tell us if you think someone else has used it.</li>
        <li>Only connect stores you own or are allowed to connect.</li>
        <li>Don&apos;t use {b} to break the law, or try to access other customers&apos; data.</li>
      </ul>

      <h2>Plans and payment</h2>
      <ul>
        <li>Plans are billed monthly in advance through Stripe, starting on the day you subscribe.</li>
        <li>The one-time setup fee (currently ${SETUP_FEE}) covers entering your menu with you. It isn&apos;t refundable once setup has started.</li>
        <li>You can cancel any time. You keep access until the end of the month you&apos;ve paid for. We don&apos;t refund part months.</li>
        <li>Founding prices stay the same for 12 months from the day you subscribe. We&apos;ll give you at least 30 days&apos; notice of any price change after that.</li>
      </ul>

      <h2>Your data</h2>
      <p>
        Your store data stays yours. We use it only to run {b} for you, as described in our{" "}
        <a href="/privacy" className="underline underline-offset-2">
          privacy policy
        </a>
        . If you cancel, you can ask us to delete your account and store connection.
      </p>

      <h2>Availability and changes</h2>
      <p>
        We work to keep {b} running but can&apos;t promise it will always be available or free of errors. Your store or
        its software can also change in ways that stop {b} working until we update it. We may change these terms;
        if the change matters, we&apos;ll email you before it takes effect.
      </p>

      <h2>Ending the service</h2>
      <p>
        We can suspend or close an account that breaks these terms or doesn&apos;t pay. If we ever stop offering {b},
        we&apos;ll give you at least 30 days&apos; notice and refund any unused prepaid time.
      </p>

      <h2>Liability</h2>
      <p>
        {b} is provided as is. To the extent the law allows, our total liability to you is limited to what you paid us
        in the three months before the claim.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms:{" "}
        <a href={`mailto:${BRAND.contactEmail}`} className="underline underline-offset-2">
          {BRAND.contactEmail}
        </a>
        .
      </p>
    </LegalPage>
  );
}
