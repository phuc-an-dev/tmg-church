import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";
import { z } from "zod";

export const AUDIT_MODULES = [
  "members",
  "ministries",
  "sessions",
  "attendance",
  "access",
  "care",
  "segments",
  "church",
  "icons",
] as const;
export const auditSearchParams = {
  module: parseAsStringLiteral(["", ...AUDIT_MODULES]).withDefault(""),
  actor: parseAsString.withDefault(""),
  action: parseAsString.withDefault(""),
  ministry: parseAsString.withDefault(""),
  group: parseAsString.withDefault(""),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};
export const auditSearchParamsCache =
  createSearchParamsCache(auditSearchParams);
const optionalId = z.union([z.literal(""), z.uuid()]);
const optionalDate = z.union([z.literal(""), z.iso.date()]);
export const auditFilterSchema = z
  .object({
    module: z.enum(["", ...AUDIT_MODULES]),
    actor: z.union([optionalId, z.literal("system")]),
    action: z.string().max(120),
    ministry: optionalId,
    group: optionalId,
    from: optionalDate,
    to: optionalDate,
    page: z.number().int().min(1).max(100000),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "Start date must be on or before end date.",
    path: ["to"],
  });
export type AuditFilters = z.infer<typeof auditFilterSchema>;
export const DEFAULT_AUDIT_FILTERS: AuditFilters = {
  module: "",
  actor: "",
  action: "",
  ministry: "",
  group: "",
  from: "",
  to: "",
  page: 1,
};
