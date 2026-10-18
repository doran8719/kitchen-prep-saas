"use client";

// src/components/app/ConnectStore.tsx
// Form that connects a WooCommerce store with a read-only key.

import { useState } from "react";

const input =
  "mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-white placeholder:text-white/35 focus:border-white/50 focus:outline-none";

export default function ConnectStore({
  needsName,
  initialName = "",
  initialUrl = "",
  initialMenuCategory = "",
  onConnected,
  onCancel,
}: {
  needsName: boolean;
  initialName?: string;
  initialUrl?: string;
  initialMenuCategory?: string;
  onConnected: () => void;
  onCancel?: () => void;
}) {
  const [businessName, setBusinessName] = useState(initialName);
  const [storeUrl, setStoreUrl] = useState(initialUrl);
  const [consumerKey, setKey] = useState("");
  const [consumerSecret, setSecret] = useState("");
  const [menuCategory, setMenuCategory] = useState(initialMenuCategory);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/business/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, storeUrl, consumerKey, consumerSecret, menuCategory }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Error ${res.status}`);
      setKey("");
      setSecret("");
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't connect the store.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 rounded-2xl border border-white/15 bg-white/5 p-6 md:grid-cols-[1fr_1.1fr] md:p-8">
      <div>
        <h2 className="wide text-2xl font-extrabold tracking-tight">Connect your store</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/65">
          Prepline needs a read-only key to see your orders and products. It can&apos;t change anything in your store,
          and you can delete the key at any time.
        </p>
        <ol className="mt-6 space-y-4 text-sm leading-relaxed text-white/80">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-monday text-xs font-bold">1</span>
            <span>
              In WordPress, go to <b>WooCommerce → Settings → Advanced → REST API</b>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-monday text-xs font-bold">2</span>
            <span>
              Click <b>Add key</b>. For the description, type <b>Prepline</b>. Set <b>Permissions</b> to <b>Read</b>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-monday text-xs font-bold">3</span>
            <span>
              Click <b>Generate API key</b> and paste the consumer key and secret here. WooCommerce only shows the
              secret once.
            </span>
          </li>
        </ol>
      </div>

      <form onSubmit={submit} className="grid content-start gap-4 text-sm">
        {needsName && (
          <label className="block">
            <span className="text-white/70">Business name</span>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className={input} />
          </label>
        )}
        <label className="block">
          <span className="text-white/70">Store address</span>
          <input
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="yourkitchen.com"
            inputMode="url"
            autoComplete="url"
            required
            className={input}
          />
        </label>
        <label className="block">
          <span className="text-white/70">Consumer key</span>
          <input
            value={consumerKey}
            onChange={(e) => setKey(e.target.value)}
            placeholder="ck_…"
            autoComplete="off"
            spellCheck={false}
            required
            className={`${input} font-mono`}
          />
        </label>
        <label className="block">
          <span className="text-white/70">Consumer secret</span>
          <input
            value={consumerSecret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="cs_…"
            type="password"
            autoComplete="off"
            spellCheck={false}
            required
            className={`${input} font-mono`}
          />
        </label>
        <label className="block">
          <span className="text-white/70">Menu category (optional)</span>
          <input
            value={menuCategory}
            onChange={(e) => setMenuCategory(e.target.value)}
            placeholder="Current Menu"
            className={input}
          />
          <span className="mt-1 block text-xs text-white/45">
            The product category you put each week&apos;s dishes in.
          </span>
        </label>

        {error && (
          <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-red-100">
            {error}
          </p>
        )}

        <div className="mt-1 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-white px-5 py-2.5 font-semibold text-ink disabled:opacity-50"
          >
            {busy ? "Checking the key…" : "Connect store"}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2.5 text-white/70 hover:text-white">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
