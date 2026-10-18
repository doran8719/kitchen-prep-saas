// app/api/business/route.ts
// GET: the logged-in user's business and whether its store is connected.

import { NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase-server";
import { getMyBusiness, getMyConnection, devEnvStore } from "@/src/lib/business";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

  try {
    const business = await getMyBusiness(supabase, user);
    if (!business) {
      const dev = devEnvStore();
      return NextResponse.json({
        business: null,
        connection: null,
        devStore: dev ? { storeUrl: dev.url } : null,
      });
    }
    const conn = await getMyConnection(supabase, business.id);
    return NextResponse.json({ business, connection: conn?.info ?? null, devStore: null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't load your account." }, { status: 500 });
  }
}
