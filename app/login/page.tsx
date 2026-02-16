"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const login = async () => {
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg(error.message);

    router.push("/app");
  };

  const signup = async () => {
    setMsg("");

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) return setMsg(error.message);

    // Depending on Supabase settings, user may need email confirmation
    setMsg("Account created. If email confirmation is required, check your inbox. Otherwise, click Login.");
  };

  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: 20 }}>
      <h1>Kitchen Prep Planner</h1>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={() => setMode("login")}
          style={{
            padding: "8px 10px",
            border: "1px solid #ddd",
            background: mode === "login" ? "#000" : "#fff",
            color: mode === "login" ? "#fff" : "#000",
            cursor: "pointer",
          }}
        >
          Login
        </button>
        <button
          onClick={() => setMode("signup")}
          style={{
            padding: "8px 10px",
            border: "1px solid #ddd",
            background: mode === "signup" ? "#000" : "#fff",
            color: mode === "signup" ? "#fff" : "#000",
            cursor: "pointer",
          }}
        >
          Create Account
        </button>
      </div>

      <input
        style={{ width: "100%", padding: 10, marginTop: 12 }}
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        style={{ width: "100%", padding: 10, marginTop: 10 }}
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {mode === "login" ? (
        <button style={{ width: "100%", padding: 10, marginTop: 12 }} onClick={login}>
          Login
        </button>
      ) : (
        <button style={{ width: "100%", padding: 10, marginTop: 12 }} onClick={signup}>
          Create Account
        </button>
      )}

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
