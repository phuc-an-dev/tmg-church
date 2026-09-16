import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

export const sessionSearchParams = {
  q: parseAsString.withDefault(""),
  term: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(20),
};

export const sessionSearchParamsCache =
  createSearchParamsCache(sessionSearchParams);

export const sessionAttendanceFilterValues = [
  "all",
  "pending",
  "present",
  "absent",
  "excused",
] as const;

export const sessionDetailSearchParams = {
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(sessionAttendanceFilterValues).withDefault(
    "pending",
  ),
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(20),
};

export const sessionDetailSearchParamsCache = createSearchParamsCache(
  sessionDetailSearchParams,
);
