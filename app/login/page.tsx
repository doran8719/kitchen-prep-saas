"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Account created. If email confirmation is enabled, check your inbox.");
        // If confirmation is OFF, you’ll be signed in immediately:
        router.push("/app");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/app");
        router.refresh();
      }
    } catch (err: any) {
      setMsg(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/5 p-6">
        <h1 className="text-2xl font-semibold">Kitchen Prep Planner</h1>
        <p className="mt-1 text-sm text-white/70">Login to access your calculator.</p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`px-4 py-2 rounded-md border ${mode === "login" ? "bg-white text-black border-white" : "border-white/20 text-white"}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`px-4 py-2 rounded-md border ${mode === "signup" ? "bg-white text-black border-white" : "border-white/20 text-white"}`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <div>
            <label className="text-sm text-white/70">Email</label>
            <input
              className="mt-1 w-full rounded-md bg-black/40 border border-white/15 px-3 py-2 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>

          <div>
            <label className="text-sm text-white/70">Password</label>
            <input
              className="mt-1 w-full rounded-md bg-black/40 border border-white/15 px-3 py-2 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-md bg-white text-black py-2 font-medium disabled:opacity-60"
          >
            {loading ? "Working..." : mode === "signup" ? "Create Account" : "Login"}
          </button>

          {msg ? <p className="text-sm text-white/80">{msg}</p> : null}
        </form>
      </div>
    </div>
  );
}
