"use client";

// src/components/app/ConnectStore.tsx
// Form that connects a kitchen's orders: a WooCommerce store (read-only key),
// or any other site through the Prepline order feed (/docs/order-feed).

import { useState } from "react";

const input =
  "mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-white placeholder:text-white/35 focus:border-white/50 focus:outline-none";

export default function ConnectStore({
  needsName,
  initialName = "",
  initialUrl = "",
  initialMenuCategory = "",
  initialPlatform = "woocommerce",
  onConnected,
  onCancel,
}: {
  needsName: boolean;
  initialName?: string;
  initialUrl?: string;
  initialMenuCategory?: string;
  initialPlatform?: "woocommerce" | "feed";
  onConnected: () => void;
  onCancel?: () => void;
}) {
  const [platform, setPlatform] = useState<"woocommerce" | "feed">(initialPlatform);
  const [businessName, setBusinessName] = useState(initialName);
  const [feedUrl, setFeedUrl] = useState(initialPlatform === "feed" ? initialUrl : "");
  const [feedKey, setFeedKey] = useState("");
  const [storeUrl, setStoreUrl] = useState(initialPlatform === "woocommerce" ? initialUrl : "");
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
        body: JSON.stringify(
          platform === "feed"
            ? { platform, businessName, feedUrl, feedKey, menuCategory }
            : { platform, businessName, storeUrl, consumerKey, consumerSecret, menuCategory }
        ),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Error ${res.status}`);
      setKey("");
      setSecret("");
      setFeedKey("");
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
        <div className="mt-4 inline-flex rounded-xl border border-white/15 p-0.5 text-sm" role="tablist">
          {(
            [
              ["woocommerce", "WooCommerce"],
              ["feed", "Custom site"],
            ] as const
          ).map(([p, label]) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={platform === p}
              onClick={() => {
                setPlatform(p);
                setError("");
              }}
              className={`rounded-lg px-3 py-1.5 ${platform === p ? "bg-white text-ink" : "text-white/70 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {platform === "woocommerce" ? (
          <>
            <p className="mt-4 text-sm leading-relaxed text-white/65">
              Prepline needs a read-only key to see your orders and products. It can&apos;t change anything in your
              store, and you can delete the key at any time.
            </p>
            <ol className="mt-6 space-y-4 text-sm leading-relaxed text-white/80">
              <Step n={1}>
                In WordPress, go to <b>WooCommerce → Settings → Advanced → REST API</b>.
              </Step>
              <Step n={2}>
                Click <b>Add key</b>. For the description, type <b>Prepline</b>. Set <b>Permissions</b> to <b>Read</b>.
              </Step>
              <Step n={3}>
                Click <b>Generate API key</b> and paste the consumer key and secret here. WooCommerce only shows the
                secret once.
              </Step>
            </ol>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm leading-relaxed text-white/65">
              For sites built by you or a developer. Your site shares the week&apos;s orders at a private address, and
              Prepline reads them with a key only the two of you know.
            </p>
            <ol className="mt-6 space-y-4 text-sm leading-relaxed text-white/80">
              <Step n={1}>
                Send your developer the{" "}
                <a href="/docs/order-feed" target="_blank" className="font-semibold underline underline-offset-2">
                  order feed guide
                </a>
                . It takes about an hour to add.
              </Step>
              <Step n={2}>They give you the feed address and the key they set on your site.</Step>
              <Step n={3}>Paste both here. Prepline checks the feed answers before saving.</Step>
            </ol>
            <p className="mt-6 text-sm text-white/55">
              On Shopify, Square or another platform? Upload a CSV export each week for now, or book a call and we&apos;ll
              connect your store during setup.
            </p>
          </>
        )}
      </div>

      <form onSubmit={submit} className="grid content-start gap-4 text-sm">
        {needsName && (
          <label className="block">
            <span className="text-white/70">Business name</span>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className={input} />
          </label>
        )}
        {platform === "feed" ? (
          <>
            <label className="block">
              <span className="text-white/70">Feed address</span>
              <input
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="https://yourkitchen.com/api/prepline/orders"
                inputMode="url"
                required
                className={input}
              />
            </label>
            <label className="block">
              <span className="text-white/70">Feed key</span>
              <input
                value={feedKey}
                onChange={(e) => setFeedKey(e.target.value)}
                type="password"
                autoComplete="off"
                spellCheck={false}
                required
                className={`${input} font-mono`}
              />
            </label>
          </>
        ) : (
          <>
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
          </>
        )}
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

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-monday text-xs font-bold">{n}</span>
      <span>{children}</span>
    </li>
  );
}
