import { NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = await supabaseServer(); // ✅ IMPORTANT
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
