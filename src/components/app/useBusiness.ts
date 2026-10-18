"use client";

// src/components/app/useBusiness.ts
import { useCallback, useEffect, useState } from "react";

export type BusinessInfo = {
  business: { id: string; name: string; preset: string; role: "owner" | "staff" } | null;
  connection: { storeUrl: string; menuCategory: string | null; connectedAt: string } | null;
  /** Local development: the store in .env.local (ALLOW_ENV_STORE=true). */
  devStore: { storeUrl: string } | null;
};

export function useBusiness() {
  const [info, setInfo] = useState<BusinessInfo | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/business", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Error ${res.status}`);
      setInfo(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your account.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { info, error, reload: load };
}
