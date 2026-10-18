"use client";

// app/app/settings/Settings.tsx
// Store connection and team.

import { useCallback, useEffect, useState } from "react";
import ConnectStore from "@/src/components/app/ConnectStore";
import { useBusiness } from "@/src/components/app/useBusiness";

const box = "rounded-2xl border border-white/15 bg-white/5 p-6";

export default function Settings() {
  const { info, error, reload } = useBusiness();
  const [reconnect, setReconnect] = useState(false);

  if (error) return <p className="text-red-200">{error}</p>;
  if (!info) return <p className="text-white/60">Loading…</p>;
  if (!info.business) {
    return (
      <div className={box}>
        <p className="text-white/70">
          You haven&apos;t connected a store yet.{" "}
          <a href="/app" className="font-semibold text-white underline underline-offset-2">
            Connect it here
          </a>
          .
        </p>
      </div>
    );
  }

  const isOwner = info.business.role === "owner";
  const c = info.connection;

  return (
    <div className="space-y-6">
      <h1 className="wide text-3xl font-extrabold tracking-tight">{info.business.name}</h1>

      {reconnect ? (
        <ConnectStore
          needsName={false}
          initialUrl={c?.storeUrl}
          initialMenuCategory={c?.menuCategory ?? ""}
          onConnected={() => {
            setReconnect(false);
            reload();
          }}
          onCancel={() => setReconnect(false)}
        />
      ) : (
        <section className={box}>
          <h2 className="text-lg font-semibold">Store</h2>
          {c ? (
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-white/55">Address</dt>
              <dd>{c.storeUrl}</dd>
              <dt className="text-white/55">Menu category</dt>
              <dd>{c.menuCategory || "Current Menu"}</dd>
              <dt className="text-white/55">Connected</dt>
              <dd>{new Date(c.connectedAt).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}</dd>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-white/65">Not connected yet.</p>
          )}
          {isOwner && (
            <button
              onClick={() => setReconnect(true)}
              className="mt-5 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              {c ? "Change key or category" : "Connect store"}
            </button>
          )}
        </section>
      )}

      {isOwner && <Team />}

      {isOwner && (
        <section className={box}>
          <h2 className="text-lg font-semibold">Plan and billing</h2>
          <a href="/billing" className="mt-2 inline-block text-sm font-semibold underline underline-offset-2">
            See your plan, update your card or cancel
          </a>
        </section>
      )}
    </div>
  );
}

function Team() {
  const [invites, setInvites] = useState<{ email: string }[]>([]);
  const [members, setMembers] = useState(1);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/business/invites", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setInvites(body.invites);
      setMembers(body.members);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/business/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(body?.error || "Couldn't add that invite.");
    setMsg(`Invited ${email}. They create an account at the login page with that email and they're in.`);
    setEmail("");
    load();
  }

  async function cancel(addr: string) {
    await fetch(`/api/business/invites?email=${encodeURIComponent(addr)}`, { method: "DELETE" });
    load();
  }

  return (
    <section className={box}>
      <h2 className="text-lg font-semibold">Team</h2>
      <p className="mt-1 text-sm text-white/65">
        {members} {members === 1 ? "person has" : "people have"} access. Teammates can run the prep sheet but can&apos;t
        change the store connection.
      </p>

      <form onSubmit={invite} className="mt-4 flex flex-wrap gap-3">
        <label className="min-w-[14rem] flex-1">
          <span className="sr-only">Teammate&apos;s email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@yourkitchen.com"
            required
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm placeholder:text-white/35 focus:border-white/50 focus:outline-none"
          />
        </label>
        <button disabled={busy} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50">
          Invite
        </button>
      </form>
      {msg && <p className="mt-3 text-sm text-white/75">{msg}</p>}

      {invites.length > 0 && (
        <ul className="mt-5 divide-y divide-white/10 border-y border-white/10 text-sm">
          {invites.map((i) => (
            <li key={i.email} className="flex items-center justify-between gap-3 py-2.5">
              <span>
                {i.email} <span className="text-white/45">(hasn&apos;t logged in yet)</span>
              </span>
              <button onClick={() => cancel(i.email)} className="text-white/60 hover:text-white">
                Cancel invite
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
