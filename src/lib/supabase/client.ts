"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

/**
 * Browser Supabase client — cookie-based session shared with the server.
 * Used by the admin login form and the admin upload flow (direct
 * browser → Supabase Storage uploads under the admin's own session,
 * so storage RLS applies).
 */
export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
