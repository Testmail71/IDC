import { cache } from "react";

import { getSettings, getTypedSettings, type Settings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

/**
 * Request-scoped, deduplicated settings accessor. Every call to `cacheSettings`
 * within the same render pass hits Supabase at most once.
 */
export const cacheSettings = cache(
  async (): Promise<ReturnType<typeof getTypedSettings>> => {
    const supabase = await createClient();
    return getTypedSettings(supabase);
  },
);

export const cacheRawSettings = cache(async (): Promise<Settings> => {
  const supabase = await createClient();
  return getSettings(supabase);
});