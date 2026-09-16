import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
} from "nuqs/server";
export const sessionSearchParams = {
  q: parseAsString.withDefault(""),
  term: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(20),
};
export const sessionSearchParamsCache =
  createSearchParamsCache(sessionSearchParams);
