import "server-only";
import { z } from "zod";
import { requireSystemAdmin } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";
import type { AuditFilters } from "./search-params";
import type { AuditPageData } from "./types";

const option = z.object({ value: z.string(), label: z.string() });
const optionsSchema = z.object({
  actors: z.array(option),
  actions: z.array(option),
  ministries: z.array(option),
  groups: z.array(option),
});
export async function getAuditPage(
  filters: AuditFilters,
): Promise<AuditPageData> {
  const auth = await requireSystemAdmin();
  const supabase = await createClient();
  const churchId = auth.systemRole.church_id;
  function listQuery() {
    let query = supabase
      .from("audit_log_directory")
      .select("*", { count: "exact" })
      .eq("church_id", churchId);
    if (filters.module) query = query.eq("module", filters.module);
    if (filters.actor === "system") query = query.is("actor_id", null);
    else if (filters.actor) query = query.eq("actor_id", filters.actor);
    if (filters.action) query = query.eq("action", filters.action);
    if (filters.ministry) query = query.eq("ministry_id", filters.ministry);
    if (filters.group) query = query.eq("group_id", filters.group);
    if (filters.from)
      query = query.gte("created_at", `${filters.from}T00:00:00+07:00`);
    if (filters.to) {
      const nextDay = new Date(`${filters.to}T00:00:00+07:00`);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      query = query.lt("created_at", nextDay.toISOString());
    }
    return query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  }
  const [result, options] = await Promise.all([
    listQuery().range((filters.page - 1) * 20, filters.page * 20 - 1),
    supabase.rpc("get_audit_filter_options", { p_church_id: churchId }),
  ]);
  if (result.error || options.error)
    throw new Error("Unable to load audit history.");
  const parsedOptions = optionsSchema.safeParse(options.data);
  if (!parsedOptions.success) throw new Error("Unable to load audit filters.");
  const count = result.count ?? 0;
  const page = Math.min(filters.page, Math.max(1, Math.ceil(count / 20)));
  if (page !== filters.page) {
    const corrected = await listQuery().range((page - 1) * 20, page * 20 - 1);
    if (corrected.error) throw new Error("Unable to load audit history.");
    return {
      entries: corrected.data ?? [],
      count,
      page,
      options: parsedOptions.data,
    };
  }
  return {
    entries: result.data ?? [],
    count,
    page,
    options: parsedOptions.data,
  };
}
