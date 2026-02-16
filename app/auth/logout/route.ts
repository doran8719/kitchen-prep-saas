import { supabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = supabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", "http://localhost:3000"));
}
