import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

/**
 * Next.js 16 Proxy (formerly middleware). Runs on the Node.js runtime.
 *
 * Scope is limited to /admin: refresh the Supabase session cookie and bounce
 * unauthenticated visitors to the login page. Real authorization is enforced
 * again in the admin layout and in every route handler.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
