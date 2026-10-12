import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import { getSettings, getTypedSettings, type Settings } from "@/lib/settings";

/**
 * Portal settings are public data (the `portal_settings` SELECT policy allows
 * anonymous access), so they are fetched with a cookie-free client and cached
 * across requests. This keeps the public shell static/ISR-friendly and removes
 * a database round-trip from every page render.
 *
 * Invalidate with `updateTag("settings")` from a Server Action.
 */
const SETTINGS_TAG = "settings";
const SETTINGS_REVALIDATE_SECONDS = 300;

function anonymousClient() {
  return createSupabaseClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const cacheSettings = unstable_cache(
  async (): Promise<ReturnType<typeof getTypedSettings>> =>
    getTypedSettings(anonymousClient()),
  ["portal-settings-typed"],
  { tags: [SETTINGS_TAG], revalidate: SETTINGS_REVALIDATE_SECONDS },
);

export const cacheRawSettings = unstable_cache(
  async (): Promise<Settings> => getSettings(anonymousClient()),
  ["portal-settings-raw"],
  { tags: [SETTINGS_TAG], revalidate: SETTINGS_REVALIDATE_SECONDS },
);

export type PublicTeacher = { id: string; full_name: string };

/**
 * Active teachers shown on the public registration form. Cached separately so
 * the register page can be statically rendered. Invalidate with
 * `updateTag("teachers")` from a Server Action after changing teachers.
 */
export const cachePublicTeachers = unstable_cache(
  async (): Promise<PublicTeacher[]> => {
    const { data } = await anonymousClient()
      .from("teachers_public")
      .select("id, full_name")
      .order("full_name");
    return (data ?? []) as PublicTeacher[];
  },
  ["public-teachers"],
  { tags: ["teachers"], revalidate: SETTINGS_REVALIDATE_SECONDS },
);
