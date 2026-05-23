import { createBrowserSupabaseClient } from "@job-tracker/core";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createBrowserSupabaseClient(supabaseUrl, supabaseAnonKey);
