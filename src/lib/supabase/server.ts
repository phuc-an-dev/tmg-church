import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import {
  getPublicSupabaseUrl,
  getPublicSupabasePublishableKey,
} from "@/lib/env";

/**
 * Per-request server Supabase client for Server Components, Server Actions,
 * and Route Handlers. Uses async Next.js cookies().
 */
export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = getPublicSupabaseUrl();
  const supabasePublishableKey = getPublicSupabasePublishableKey();

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          // Handle the Server Component read-only context intentionally.
          // In Next.js, cookies can only be modified in Server Actions or Route Handlers.
          // Calling set() from a Server Component throws ReadonlyRequestCookiesError.
          const isServerComponentReadOnly =
            error instanceof Error &&
            (error.name === "ReadonlyRequestCookiesError" ||
              error.message.includes("Cookies can only be modified"));

          if (!isServerComponentReadOnly) {
            // Re-throw unexpected failures in writable contexts
            throw error;
          }
        }
      },
    },
  });
}
