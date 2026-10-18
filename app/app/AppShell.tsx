// app/app/AppShell.tsx
// Header and page frame for the logged-in app.
import Link from "next/link";
import { Wordmark } from "@/src/components/site/SiteChrome";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const link = "rounded-md px-3 py-2 text-paper/70 hover:text-paper";
  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Link href="/app" className="text-xl" aria-label="Weekly prep">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-0.5 text-sm">
          <Link href="/app" className={link}>
            Prep sheet
          </Link>
          <Link href="/app/settings" className={link}>
            Settings
          </Link>
          <form action="/auth/logout" method="post">
            <button type="submit" className={link}>
              Log out
            </button>
          </form>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-2 sm:px-6">{children}</main>
    </div>
  );
}
