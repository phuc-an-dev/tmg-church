import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  getPublicSupabaseUrl,
  getPublicSupabasePublishableKey,
} from "@/lib/env";

let client: SupabaseClient<Database> | undefined;

/**
 * Memoized browser Supabase client for Client Components.
 * Reuses a single instance in the browser.
 */
export function createClient(): SupabaseClient<Database> {
  if (client) {
    return client;
  }

  const supabaseUrl = getPublicSupabaseUrl();
  const supabasePublishableKey = getPublicSupabasePublishableKey();

  client = createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
  return client;
}
