import type { Database } from "@/types/database";
export type AuditEntry =
  Database["public"]["Views"]["audit_log_directory"]["Row"];
export type AuditOption = { value: string; label: string };
export type AuditOptions = {
  actors: AuditOption[];
  actions: AuditOption[];
  ministries: AuditOption[];
  groups: AuditOption[];
};
export type AuditPageData = {
  entries: AuditEntry[];
  count: number;
  page: number;
  options: AuditOptions;
};
