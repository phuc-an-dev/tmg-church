import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeAdminRedirect } from "@/features/auth/safe-redirect";

function createNonCacheableRedirect(url: URL): NextResponse {
  const response = NextResponse.redirect(url);
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");

  const safeNext = getSafeAdminRedirect(nextParam);

  if (!code) {
    return createNonCacheableRedirect(
      new URL("/admin/login?status=link-invalid", origin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return createNonCacheableRedirect(
      new URL("/admin/login?status=link-invalid", origin),
    );
  }

  return createNonCacheableRedirect(new URL(safeNext, origin));
}
