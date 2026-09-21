import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

/**
 * Server Supabase client bound to the request's cookie store.
 *
 * Used by Server Components AND route handlers — every query runs under the
 * caller's own session, so Postgres RLS is always enforced (anon visitors get
 * published rows only; the authenticated admin gets full access).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component (read-only cookie store).
          // Session refresh is handled by src/proxy.ts instead.
        }
      },
    },
  });
}
