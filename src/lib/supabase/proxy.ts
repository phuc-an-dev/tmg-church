import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import {
  getPublicSupabaseUrl,
  getPublicSupabasePublishableKey,
} from "@/lib/env";

/**
 * Synchronizes Supabase auth cookies between request and response in Next.js Proxy.
 * Calls getClaims() to trigger session refresh.
 * Propagates Set-Cookie and cache headers (Cache-Control, Expires, Pragma) to the response.
 * Does NOT query the database or leaders table.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = getPublicSupabaseUrl();
  const supabasePublishableKey = getPublicSupabasePublishableKey();

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });

          if (headers) {
            Object.entries(headers).forEach(([key, value]) => {
              supabaseResponse.headers.set(key, value);
            });
          }
        },
      },
    },
  );

  // Trigger lazy session initialization / refresh via getClaims() without database lookup
  await supabase.auth.getClaims();

  return supabaseResponse;
}
