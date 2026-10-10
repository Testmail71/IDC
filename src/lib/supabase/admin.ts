import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Privileged server-only Supabase client using the service-role key.
 *
 * SECURITY: This client bypasses Row Level Security. It must NEVER be imported
 * by client components or any module that can run in the browser. It is used
 * only for tightly-scoped, server-verified operations such as creating a user
 * during registration and generating secure signed download URLs.
 */
export function createAdminClient() {
  return createSupabaseClient(
    publicEnv.supabaseUrl,
    serverEnv.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
