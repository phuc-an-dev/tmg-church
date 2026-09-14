import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

export const MEMBER_PAGE_SIZES = [20, 50, 100] as const;
export const DEFAULT_MEMBER_PAGE_SIZE = 20;
export const MEMBER_PAGE_SIZE = DEFAULT_MEMBER_PAGE_SIZE;

export const memberSearchParams = {
  q: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(["full_name", "birth_year"] as const).withDefault(
    "full_name",
  ),
  order: parseAsStringLiteral(["asc", "desc"] as const).withDefault("asc"),
  status: parseAsStringLiteral([
    "active",
    "archived",
    "all",
  ] as const).withDefault("active"),
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(DEFAULT_MEMBER_PAGE_SIZE),
  edit: parseAsString.withDefault(""),
};

export const memberSearchParamsCache =
  createSearchParamsCache(memberSearchParams);

export function normalizeMemberSearch(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
