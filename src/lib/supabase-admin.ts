// src/lib/supabase-admin.ts
// SERVER ONLY. A Supabase client with the secret (service role) key, which
// skips row level security. Only for Stripe's webhook, which has no logged-in user.
// Never import this from a "use client" file.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY isn't set on the server.");
  admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
