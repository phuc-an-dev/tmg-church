function validateUrl(value: string | undefined, name: string): string {
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  const trimmed = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid ${name} format. Must be a valid URL.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Invalid ${name} protocol. Must use http: or https:.`);
  }
  return trimmed;
}

function validateKey(value: string | undefined, name: string): string {
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

/**
 * Directly references process.env.NEXT_PUBLIC_SUPABASE_URL for browser-safe bundling.
 */
export function getPublicSupabaseUrl(): string {
  return validateUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  );
}

/**
 * Directly references process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for browser-safe bundling.
 */
export function getPublicSupabasePublishableKey(): string {
  return validateKey(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
}

/**
 * Returns deterministic site URL:
 * - Validates NEXT_PUBLIC_SITE_URL if explicitly provided.
 * - Defaults to https://tmgchurch.website in production.
 * - Defaults to http://localhost:3000 in development.
 */
export function getSiteUrl(): string {
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (rawSiteUrl) {
    const validated = validateUrl(rawSiteUrl, "NEXT_PUBLIC_SITE_URL");
    return validated.replace(/\/+$/, "");
  }
  return process.env.NODE_ENV === "production"
    ? "https://tmgchurch.website"
    : "http://localhost:3000";
}

/**
 * Aggregate helper for server-side initialization.
 */
export function getPublicEnv() {
  return {
    supabaseUrl: getPublicSupabaseUrl(),
    supabasePublishableKey: getPublicSupabasePublishableKey(),
    siteUrl: getSiteUrl(),
  };
}
