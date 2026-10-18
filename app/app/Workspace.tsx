"use client";

// app/app/Workspace.tsx
// Loads the user's business: connect the store if needed, otherwise the calculator.

import { useMemo } from "react";
import ProteinCalculatorEmbed from "@/src/components/ProteinCalculatorEmbed";
import ConnectStore from "@/src/components/app/ConnectStore";
import { useBusiness } from "@/src/components/app/useBusiness";
import { presetFor } from "@/src/lib/prep/presets";

export default function Workspace() {
  const { info, error, reload } = useBusiness();

  const preset = useMemo(() => {
    if (info?.business && info.connection) {
      return presetFor(info.business.preset, {
        businessName: info.business.name,
        menuCategory: info.connection.menuCategory,
      });
    }
    if (!info?.business && info?.devStore) return presetFor("hungry-house");
    return null;
  }, [info]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-6 text-red-100">
        {error}{" "}
        <button onClick={reload} className="underline underline-offset-2">
          Try again
        </button>
      </div>
    );
  }
  if (!info) return <p className="text-white/60">Loading your kitchen…</p>;

  if (preset) {
    return (
      <>
        {info.devStore && !info.business && (
          <p className="mb-4 rounded-xl border border-tape/40 bg-tape/10 px-4 py-2 text-sm text-tape">
            Local testing: using the store in .env.local ({info.devStore.storeUrl}). Connect a store to stop using it.
          </p>
        )}
        <ProteinCalculatorEmbed key={info.business?.id ?? "dev"} catalog={preset.catalog} savedMenus={preset.savedMenus} />
      </>
    );
  }

  if (info.business && info.business.role !== "owner") {
    return (
      <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
        <h2 className="text-xl font-semibold">{info.business.name} isn&apos;t connected yet</h2>
        <p className="mt-2 text-white/65">Ask the account owner to connect the store. Then refresh this page.</p>
      </div>
    );
  }

  return (
    <ConnectStore
      needsName={!info.business}
      initialName={info.business?.name}
      onConnected={reload}
    />
  );
}
