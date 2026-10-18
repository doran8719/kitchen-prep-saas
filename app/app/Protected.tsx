// app/app/Protected.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabase-browser";

type SubRow = {
  status: string | null;
};

export default function Protected({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // 1) Must be logged in
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      // 2) Must have active subscription — only once Stripe is set up.
      //    Turn on with NEXT_PUBLIC_REQUIRE_SUBSCRIPTION=true in .env.local / your host.
      if (process.env.NEXT_PUBLIC_REQUIRE_SUBSCRIPTION !== "true") {
        if (!cancelled) setReady(true);
        return;
      }

      const userId = session.user.id;

      const { data: subRow, error } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", userId)
        .maybeSingle<SubRow>();

      // If your table doesn't exist yet, this will error.
      // In that case, comment this block until you've created the table.
      if (error) {
        // If you want to treat "missing table" as unpaid:
        router.replace("/billing");
        return;
      }

      if (!subRow || subRow.status !== "active") {
        router.replace("/billing");
        return;
      }

      if (!cancelled) setReady(true);
    }

    run();

    // If user logs out or session expires -> kick to login
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (!ready) return null; // swap with a loading spinner if you want
  return <>{children}</>;
}