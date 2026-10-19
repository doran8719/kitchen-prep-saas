// src/lib/business.ts
// SERVER ONLY. The logged-in user's business and its store connection.
// All reads go through the user's own session, so Supabase's row level
// security decides what they can see (see supabase/migrations/001_businesses.sql).

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { open } from "@/src/lib/secret-box";
import { wooConfigFromEnv, type WooConfig } from "@/src/lib/woo/client";
import type { FeedConfig } from "@/src/lib/feed/feed";

export type Platform = "woocommerce" | "feed";

/** How to reach a kitchen's orders. */
export type StoreConfig = { platform: "woocommerce"; woo: WooConfig } | { platform: "feed"; feed: FeedConfig };

export interface MyBusiness {
  id: string;
  name: string;
  preset: string;
  role: "owner" | "staff";
}

export interface MyConnection {
  platform: Platform;
  storeUrl: string;
  menuCategory: string | null;
  connectedAt: string;
}

/** The user's business, joining one they were invited to if they have none. Null if neither. */
export async function getMyBusiness(supabase: SupabaseClient, user: User): Promise<MyBusiness | null> {
  // Picks up an invite the first time an invited teammate logs in.
  await supabase.rpc("accept_invites");

  const { data: member, error } = await supabase
    .from("business_members")
    .select("role, businesses ( id, name, preset )")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message)) {
      throw new Error("The database isn't set up for businesses yet. Run supabase/migrations/001_businesses.sql.");
    }
    throw new Error(error.message);
  }
  const b = (member as { role: string; businesses: { id: string; name: string; preset: string } | null } | null)
    ?.businesses;
  if (!member || !b) return null;
  return { id: b.id, name: b.name, preset: b.preset, role: member.role === "owner" ? "owner" : "staff" };
}

export async function getMyConnection(
  supabase: SupabaseClient,
  businessId: string
): Promise<{ info: MyConnection; cfg: StoreConfig } | null> {
  const { data, error } = await supabase
    .from("store_connections")
    .select("platform, store_url, key_enc, secret_enc, menu_category, connected_at")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const platform: Platform = data.platform === "feed" ? "feed" : "woocommerce";
  const info = { platform, storeUrl: data.store_url, menuCategory: data.menu_category, connectedAt: data.connected_at };
  const cfg: StoreConfig =
    platform === "feed"
      ? { platform, feed: { url: data.store_url, key: open(data.key_enc) } }
      : { platform, woo: { url: data.store_url, key: open(data.key_enc), secret: open(data.secret_enc) } };
  return { info, cfg };
}

/**
 * Has this user paid (or is their kitchen comped)? See my_access() in
 * supabase/migrations/002_billing.sql. PAYWALL=off skips the check (local testing only).
 */
export async function hasAccess(supabase: SupabaseClient): Promise<boolean> {
  if (process.env.PAYWALL === "off") return true;
  const { data, error } = await supabase.rpc("my_access");
  if (error) {
    if (/my_access/.test(error.message)) {
      throw new Error("The database isn't set up for billing yet. Run supabase/migrations/002_billing.sql.");
    }
    throw new Error(error.message);
  }
  return data === true;
}

/**
 * Local development only: use the WOO_* variables in .env.local when the
 * logged-in user has no business yet. Turned on with ALLOW_ENV_STORE=true.
 * Never set it on the live site, or every new account would see that store.
 */
export function devEnvStore(): WooConfig | null {
  if (process.env.ALLOW_ENV_STORE !== "true") return null;
  return wooConfigFromEnv();
}
