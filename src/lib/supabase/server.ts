import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";

/**
 * Server-side Supabase client bound to the current request cookies.
 *
 * Must be awaited inside Server Components, Server Actions and Route Handlers.
 * It carries the signed-in user's session, so all queries run under that
 * user's Row Level Security policies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
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
          // `setAll` is called from a Server Component where cookies are
          // read-only. This can be safely ignored when middleware/proxy is
          // refreshing the session.
        }
      },
    },
  });
}
