import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

/**
 * Creates a Supabase client using the service role key. This bypasses Row
 * Level Security and must only ever be used from trusted server-side code
 * (API routes / Route Handlers), never exposed to the browser.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Validates the admin key supplied by the client against the server secret. */
export function isValidAdminKey(key: unknown): key is string {
  const adminKey = process.env.ADMIN_KEY;
  if (typeof key !== "string" || !adminKey || key.length === 0) return false;

  const keyBuffer = Buffer.from(key);
  const adminKeyBuffer = Buffer.from(adminKey);

  // Buffers must be the same length for timingSafeEqual; compare against the
  // secret's own length first so we don't leak length via an early throw,
  // and fall back to a fixed-size dummy comparison to keep timing constant.
  if (keyBuffer.length !== adminKeyBuffer.length) {
    timingSafeEqual(adminKeyBuffer, adminKeyBuffer);
    return false;
  }

  return timingSafeEqual(keyBuffer, adminKeyBuffer);
}
