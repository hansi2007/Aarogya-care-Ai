import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "";

export const supabase = createClient(supabaseUrl, supabaseKey);

export function isSupabaseConfigured(): boolean {
  return (
    !!supabaseUrl &&
    supabaseUrl.length > 0 &&
    !supabaseUrl.includes("your-project") &&
    !!supabaseKey &&
    supabaseKey.length > 0
  );
}
