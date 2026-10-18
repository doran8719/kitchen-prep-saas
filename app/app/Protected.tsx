// app/app/Protected.tsx
// Logged-in users only. Whether they've paid is checked by the server
// (my_access) and shown by Workspace, so staff of a paid kitchen get in too.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabase-browser";

export default function Protected({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) router.replace("/login");
      else setReady(true);
    });

    // Logged out or session expired: back to the login page
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (!ready) return null;
  return <>{children}</>;
}
