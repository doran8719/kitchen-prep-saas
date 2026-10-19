// app/login/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabase-browser";
import { Wordmark } from "@/src/components/site/SiteChrome";

export default function LoginPage() {
  const router = useRouter();

  // One client for this component's lifetime
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Already logged in: go straight to the app
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) router.replace("/app");
    });
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/login` },
        });
        if (error) throw error;
        // Email confirmation off: signed in already. On: they confirm by email first.
        if (data.session) {
          router.replace("/app");
          return;
        }
        setMsg("Account created. We've emailed you a confirmation link. Click it, then log in here.");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session) {
        setMsg("You're logged in, but the session didn't load. Refresh the page.");
        return;
      }

      // replace, not push, so Back doesn't return to this page
      router.replace("/app");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "That didn't work. Check your email and password and try again.");
    } finally {
      setLoading(false);
    }
  }

  const tab = (m: "login" | "signup", label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(m);
        setMsg("");
      }}
      aria-pressed={mode === m}
      className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${
        mode === m ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col bg-steel px-4 py-6 text-ink">
      <Link href="/" className="mx-auto w-full max-w-md text-xl sm:max-w-lg" aria-label="Home">
        <Wordmark />
      </Link>

      <main className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md bg-paper px-6 py-8 shadow-[0_18px_40px_-22px_rgba(27,36,48,0.45)] sm:px-8">
          <h1 className="wide text-3xl font-extrabold tracking-tight">
            {mode === "login" ? "Log in" : "Create your account"}
          </h1>

          <div className="mt-6 flex gap-1 rounded-lg bg-steel p-1">
            {tab("login", "Log in")}
            {tab("signup", "Create account")}
          </div>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <label className="grid gap-1 text-sm font-semibold">
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                required
                className="rounded-md border-2 border-steel-deep bg-paper px-3 py-2.5 text-base font-normal focus:border-monday focus:outline-none"
              />
            </label>

            <label className="grid gap-1 text-sm font-semibold">
              Password
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={mode === "signup" ? 8 : undefined}
                required
                className="rounded-md border-2 border-steel-deep bg-paper px-3 py-2.5 text-base font-normal focus:border-monday focus:outline-none"
              />
            </label>

            <button
              disabled={loading}
              type="submit"
              className="mt-2 rounded-md bg-ink px-4 py-3 font-semibold text-paper hover:bg-monday-deep disabled:opacity-60"
            >
              {loading ? "One moment…" : mode === "signup" ? "Create account" : "Log in"}
            </button>

            {msg ? (
              <p role="status" className="text-sm text-ink-soft">
                {msg}
              </p>
            ) : null}
          </form>
        </div>
      </main>
    </div>
  );
}
