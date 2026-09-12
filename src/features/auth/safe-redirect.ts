/**
 * Validates the `next` redirect target to ensure it is strictly within the /admin space.
 * Rejects external origins, protocol-relative URLs, backslashes, encoded path tricks,
 * and destinations outside /admin.
 */
export function getSafeAdminRedirect(next: string | null | undefined): string {
  if (!next || typeof next !== "string") {
    return "/admin";
  }

  const trimmed = next.trim();

  // Must strictly start with a single forward slash
  if (!trimmed.startsWith("/")) {
    return "/admin";
  }

  // Reject protocol-relative or backslash-based paths
  if (
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("\\")
  ) {
    return "/admin";
  }

  // Reject encoded slashes or colons (%2f, %5c, %3a)
  if (/%(?:2f|5c|3a)/i.test(trimmed)) {
    return "/admin";
  }

  // Reject control characters or newlines
  if (/[\r\n\t\0]/.test(trimmed)) {
    return "/admin";
  }

  try {
    const parsed = new URL(trimmed, "http://localhost");
    if (parsed.origin !== "http://localhost") {
      return "/admin";
    }

    const pathname = parsed.pathname;
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      return `${pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return "/admin";
  }

  return "/admin";
}
