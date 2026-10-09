import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

export const careSearchParams = {
  tab: parseAsStringLiteral(["open", "suggestions", "history"]).withDefault(
    "open",
  ),
  group: parseAsString,
  page: parseAsInteger.withDefault(1),
  q: parseAsString.withDefault(""),
};
export const careSearchParamsCache = createSearchParamsCache(careSearchParams);
