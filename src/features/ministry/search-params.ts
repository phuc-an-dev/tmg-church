import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

const pageSize = parseAsInteger.withDefault(20).withOptions({ shallow: false });
const page = parseAsInteger.withDefault(1).withOptions({ shallow: false });
export const ministrySearchParams = {
  q: parseAsString.withDefault(""),
  page,
  pageSize,
  sort: parseAsStringLiteral(["name-asc", "name-desc"] as const).withDefault(
    "name-asc",
  ),
};
export const termSearchParams = {
  q: parseAsString.withDefault(""),
  page,
  pageSize,
  status: parseAsStringLiteral([
    "all",
    "current",
    "upcoming",
    "ended",
  ] as const).withDefault("all"),
  sort: parseAsStringLiteral([
    "start-desc",
    "start-asc",
    "name-asc",
  ] as const).withDefault("start-desc"),
};
export const structureSearchParams = {
  q: parseAsString.withDefault(""),
  page,
  pageSize,
  section: parseAsStringLiteral(["groups", "departments"] as const).withDefault(
    "groups",
  ),
};
export const ministrySearchParamsCache =
  createSearchParamsCache(ministrySearchParams);
export const termSearchParamsCache = createSearchParamsCache(termSearchParams);
export const structureSearchParamsCache = createSearchParamsCache(
  structureSearchParams,
);

export function safePageSize(value: number) {
  return value === 50 || value === 100 ? value : 20;
}
export function normalizedSearch(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
