// app/api/business/connect/route.ts
// POST { businessName, storeUrl, consumerKey, consumerSecret, menuCategory? }
// Checks the key can read the store, then saves it (encrypted) for the user's
// business, creating the business first if they don't have one yet.

import { NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase-server";
import { getMyBusiness, hasAccess } from "@/src/lib/business";
import { seal } from "@/src/lib/secret-box";
import { normalizeStoreUrl, testConnection, WooError } from "@/src/lib/woo/client";
import { presetForStoreUrl } from "@/src/lib/prep/presets";

export const dynamic = "force-dynamic";

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

  try {
    if (!(await hasAccess(supabase))) {
      return NextResponse.json({ error: "Subscribe first, then connect your store. Go to Billing." }, { status: 402 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't check your plan." }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Something went wrong sending the form. Try again." }, { status: 400 });
  }

  const businessName = str(body.businessName, 120);
  const storeUrl = normalizeStoreUrl(str(body.storeUrl));
  const key = str(body.consumerKey);
  const secret = str(body.consumerSecret);
  const menuCategory = str(body.menuCategory, 120) || null;

  if (!storeUrl) return NextResponse.json({ error: "Enter your store's web address, like yourkitchen.com." }, { status: 400 });
  if (!/^ck_[a-f0-9]{20,}$/i.test(key)) {
    return NextResponse.json({ error: "The consumer key should start with ck_. Copy it again from WooCommerce." }, { status: 400 });
  }
  if (!/^cs_[a-f0-9]{20,}$/i.test(secret)) {
    return NextResponse.json({ error: "The consumer secret should start with cs_. Copy it again from WooCommerce." }, { status: 400 });
  }

  // 1) Does the key work?
  try {
    await testConnection({ url: storeUrl, key, secret });
  } catch (e) {
    const status = e instanceof WooError ? e.status : 0;
    const msg =
      status === 401 || status === 403
        ? "Your store didn't accept that key. Check you copied both the key and the secret, and that the key's permission is Read."
        : status === 404
          ? "We couldn't find WooCommerce at that address. Check the address, and that WooCommerce is installed and permalinks are turned on."
          : "We couldn't reach your store. Check the address and try again.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // 2) The business (existing, or a new one with this user as owner).
  let business = await getMyBusiness(supabase, user).catch((e: Error) => e);
  if (business instanceof Error) return NextResponse.json({ error: business.message }, { status: 500 });
  if (!business) {
    if (!businessName) return NextResponse.json({ error: "Enter your business name." }, { status: 400 });
    const { error } = await supabase.rpc("create_business", { p_name: businessName });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    business = await getMyBusiness(supabase, user);
    if (!business) return NextResponse.json({ error: "Couldn't create your business. Try again." }, { status: 500 });
  }
  if (business.role !== "owner") {
    return NextResponse.json({ error: "Only the account owner can change the store connection." }, { status: 403 });
  }

  // 3) Settings preset (set up per kitchen) and name.
  const updates: Record<string, string> = {};
  const preset = presetForStoreUrl(storeUrl);
  if (business.preset === "standard" && preset !== "standard") updates.preset = preset;
  if (businessName && businessName !== business.name) updates.name = businessName;
  if (Object.keys(updates).length) {
    const { error } = await supabase.from("businesses").update(updates).eq("id", business.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 4) Save the connection, encrypted.
  let sealed: { key_enc: string; secret_enc: string };
  try {
    sealed = { key_enc: seal(key), secret_enc: seal(secret) };
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't secure the key." }, { status: 500 });
  }
  const { error } = await supabase.from("store_connections").upsert(
    {
      business_id: business.id,
      platform: "woocommerce",
      store_url: storeUrl,
      ...sealed,
      menu_category: menuCategory,
      connected_by: user.id,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "business_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, storeUrl });
}
