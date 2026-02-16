import { NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = supabaseServer();
  await supabase.auth.signOut();

  // Redirect to /login using the current request URL as the base (works on Vercel)
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
