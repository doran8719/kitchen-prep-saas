import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import ProteinCalculatorEmbed from "@/components/ProteinCalculatorEmbed";

export default async function AppPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div style={{ maxWidth: 1100, margin: "40px auto", padding: 20 }}>
      <h1 style={{ marginBottom: 6 }}>Kitchen Prep SaaS</h1>

      <p style={{ color: "#555", marginTop: 0 }}>
        Logged in as <strong>{user.email}</strong>
      </p>

      <form action="/auth/logout" method="post" style={{ marginTop: 12 }}>
        <button
          style={{
            padding: "8px 12px",
            cursor: "pointer",
            border: "1px solid #ccc",
            borderRadius: 4,
            background: "#fff",
          }}
        >
          Logout
        </button>
      </form>

      <hr style={{ margin: "28px 0" }} />

      {/* SaaS Feature: Protein Calculator */}
      <ProteinCalculatorEmbed />
    </div>
  );
}
