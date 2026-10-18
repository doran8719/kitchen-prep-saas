// src/components/site/LegalPage.tsx
import { SiteFooter, SiteHeader } from "@/src/components/site/SiteChrome";

export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-steel text-ink">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:px-8">
        <div className="bg-paper px-6 py-10 sm:px-12 sm:py-14">
          <h1 className="wide text-4xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-ink-soft">Last updated {updated}</p>
          <div className="mt-8 space-y-4 leading-relaxed text-ink [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
            {children}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
