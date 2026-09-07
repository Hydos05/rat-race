import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in Client Components. This client uses
 * the public anon key and respects Row Level Security policies.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
