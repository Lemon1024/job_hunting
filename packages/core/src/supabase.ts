import { createClient } from "@supabase/supabase-js";

export function createBrowserSupabaseClient(url: string, anonKey: string) {
  if (!url || !anonKey) {
    throw new Error("Supabase URL and anon key are required.");
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
}

export type SupabaseClientLike = ReturnType<typeof createBrowserSupabaseClient>;
