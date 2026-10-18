// src/components/site/SiteChrome.tsx
// Wordmark, header and footer for the public pages.

import Link from "next/link";
import { BRAND, demoHref } from "@/src/lib/brand";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* a Monday "day dot", the label kitchens stick on what goes out Monday */}
      <span className="inline-block h-[0.8em] w-[0.8em] rounded-full bg-monday" aria-hidden="true" />
      <span className="wide font-extrabold tracking-tight">{BRAND.name}</span>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-8">
      <Link href="/" className="text-xl" aria-label={`${BRAND.name} home`}>
        <Wordmark />
      </Link>
      <nav className="flex items-center gap-1 text-sm sm:gap-2">
        <Link href="/#pricing" className="hidden rounded-md px-3 py-2 hover:bg-steel-deep/60 sm:inline-block">
          Pricing
        </Link>
        <Link href="/login" className="rounded-md px-3 py-2 hover:bg-steel-deep/60">
          Log in
        </Link>
        <a
          href={demoHref()}
          className="rounded-md bg-ink px-3 py-2 font-semibold text-paper hover:bg-monday-deep sm:px-4"
        >
          Run my orders free
        </a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-steel-deep">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-soft sm:px-8">
        <p>
          <Wordmark className="text-ink" /> <span className="ml-2">is made by {BRAND.legalEntity}.</span>
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <a href={`mailto:${BRAND.contactEmail}`} className="hover:text-ink">
            {BRAND.contactEmail}
          </a>
        </nav>
      </div>
    </footer>
  );
}
