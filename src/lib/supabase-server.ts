import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  );
}

function getSupabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ""
  );
}

export async function supabaseServer() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  // If these are missing, we want a CLEAR error (not the vague supabase/ssr one)
  if (!url || !anonKey) {
    throw new Error(
      `Missing Supabase env vars. Got:
NEXT_PUBLIC_SUPABASE_URL=${Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)}
SUPABASE_URL=${Boolean(process.env.SUPABASE_URL)}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)}
SUPABASE_ANON_KEY=${Boolean(process.env.SUPABASE_ANON_KEY)}`
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          (cookieStore as any).set(name, value, options);
        });
      },
    },
  });
}
