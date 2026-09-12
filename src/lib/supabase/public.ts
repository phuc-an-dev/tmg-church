import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  getPublicSupabaseUrl,
  getPublicSupabasePublishableKey,
} from "@/lib/env";

/**
 * Anonymous public Supabase client restricted to approved public views.
 * Does not persist or refresh sessions, and never imports headers or session storage.
 */
export function createPublicClient() {
  const supabaseUrl = getPublicSupabaseUrl();
  const supabasePublishableKey = getPublicSupabasePublishableKey();

  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
