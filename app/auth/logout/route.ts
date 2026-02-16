import { NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase-server";

export async function POST() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();

  // Redirect back to login (use the request origin in production)
  return NextResponse.redirect(new URL("/login", "http://localhost:3000"), {
    status: 303,
  });
}
