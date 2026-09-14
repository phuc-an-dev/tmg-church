/**
 * Normalizes phone numbers, specifically handling cases where
 * Excel automatically strips leading zeros from numeric columns
 * (e.g. 901234567 -> 0901234567), as well as common delimiters and prefixes.
 */
export function normalizePhoneNumber(
  raw: string | number | null | undefined,
): string | null {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  if (!str) return null;

  // Preserve foreign international format (e.g. +1 555..., +44...),
  // but standardize Vietnamese +84 numbers to domestic 0...
  if (str.startsWith("+")) {
    const vDigits = str.replace(/[^\d]/g, "");
    if (vDigits.startsWith("84") && vDigits.length === 11) {
      return `0${vDigits.slice(2)}`;
    }
    return str.replace(/[\s.-]/g, "");
  }

  // Strip spaces, dots, dashes, parentheses
  const digitsOnly = str.replace(/[\s.\-()]/g, "");

  // Standard 10 digits starting with 0 (e.g. 0901234567)
  if (/^0\d{9}$/.test(digitsOnly)) {
    return digitsOnly;
  }

  // 9 digits without leading 0 (Excel stripped the 0, e.g. 901234567, 345678901)
  if (/^[1-9]\d{8}$/.test(digitsOnly)) {
    return `0${digitsOnly}`;
  }

  // 11 digits starting with 84 without + (e.g. 84901234567)
  if (/^84[35789]\d{8}$/.test(digitsOnly)) {
    return `0${digitsOnly.slice(2)}`;
  }

  return digitsOnly || str;
}
