// app/api/business/invites/route.ts
// GET: pending invites. POST { email }: invite a teammate. DELETE ?email=: cancel.
// The teammate creates an account with that email and is added on first login.

import { NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase-server";
import { getMyBusiness } from "@/src/lib/business";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function owner() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Please log in again." }, { status: 401 }) };
  const business = await getMyBusiness(supabase, user);
  if (!business) return { error: NextResponse.json({ error: "Connect your store first." }, { status: 400 }) };
  if (business.role !== "owner") {
    return { error: NextResponse.json({ error: "Only the account owner can manage the team." }, { status: 403 }) };
  }
  return { supabase, user, business };
}

export async function GET() {
  const o = await owner();
  if ("error" in o) return o.error;
  const [{ data: invites }, { count }] = await Promise.all([
    o.supabase.from("business_invites").select("email, created_at").eq("business_id", o.business.id).order("created_at"),
    o.supabase.from("business_members").select("user_id", { count: "exact", head: true }).eq("business_id", o.business.id),
  ]);
  return NextResponse.json({ invites: invites ?? [], members: count ?? 1 });
}

export async function POST(request: Request) {
  const o = await owner();
  if ("error" in o) return o.error;
  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  const clean = (email || "").trim().toLowerCase();
  if (!EMAIL.test(clean)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (clean === o.user.email?.toLowerCase()) return NextResponse.json({ error: "That's your own email." }, { status: 400 });
  const { error } = await o.supabase
    .from("business_invites")
    .upsert({ business_id: o.business.id, email: clean, invited_by: o.user.id }, { onConflict: "business_id,email" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const o = await owner();
  if ("error" in o) return o.error;
  const email = new URL(request.url).searchParams.get("email")?.toLowerCase() || "";
  const { error } = await o.supabase.from("business_invites").delete().eq("business_id", o.business.id).eq("email", email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
