import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

export const MEMBER_PAGE_SIZE = 20;

export const memberSearchParams = {
  q: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(["full_name", "birth_year"] as const).withDefault(
    "full_name",
  ),
  order: parseAsStringLiteral(["asc", "desc"] as const).withDefault("asc"),
  page: parseAsInteger.withDefault(1),
  edit: parseAsString.withDefault(""),
};

export const memberSearchParamsCache =
  createSearchParamsCache(memberSearchParams);

export function normalizeMemberSearch(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
