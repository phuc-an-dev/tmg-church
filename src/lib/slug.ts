/**
 * Utilities for generating clean, URL-friendly Vietnamese slugs.
 * Removes diacritics, converts 'đ/Đ' to 'd', keeps lowercase ASCII and single hyphens.
 */

export function generateVietnameseSlug(text: string): string {
  if (!text) return "";

  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove combining diacritical marks
    .replace(/[đĐ]/g, "d") // Convert Vietnamese đ/Đ to d
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumerics with hyphens
    .replace(/^-+|-+$/g, "") // Trim leading and trailing hyphens
    .replace(/-{2,}/g, "-"); // Collapse consecutive hyphens
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return UUID_REGEX.test(value.trim());
}
