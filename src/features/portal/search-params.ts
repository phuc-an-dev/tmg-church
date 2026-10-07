import {
  createSearchParamsCache,
  parseAsString,
  parseAsBoolean,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs/server";

export const portalSessionScopeValues = [
  "ministry-group",
  "all",
  "department",
  "ministry",
  "group",
] as const;
export type PortalSessionScope = (typeof portalSessionScopeValues)[number];

export const portalDashboardSearchParams = {
  section: parseAsStringLiteral([
    "upcoming",
    "readiness",
    "assignments",
    "workspaces",
  ] as const).withDefault("upcoming"),
};

export const portalDashboardSearchParamsCache = createSearchParamsCache(
  portalDashboardSearchParams,
);

export const portalUpcomingSearchParams = {
  assigned: parseAsBoolean.withDefault(false),
  page: parseAsInteger.withDefault(1),
  q: parseAsString.withDefault(""),
  scope: parseAsStringLiteral(portalSessionScopeValues).withDefault(
    "ministry-group",
  ),
  month: parseAsString.withDefault(""),
  date: parseAsString.withDefault(""),
};
