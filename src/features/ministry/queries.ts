import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireLeader } from "@/features/auth/queries";
import { getActiveChurch } from "@/features/church/queries";
import { normalizedSearch, safePageSize } from "./search-params";
import type {
  MinistryContext,
  MinistryItem,
  PageResult,
  StructureItem,
  TermContext,
  TermItem,
} from "./types";

function todayInHoChiMinh() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/\//g, "-");
}
function termStatus(
  startDate: string | null,
  endDate: string | null,
): TermItem["status"] {
  const today = todayInHoChiMinh();
  if (!startDate && !endDate) return "unscheduled";
  if (startDate && startDate > today) return "upcoming";
  if (endDate && endDate < today) return "ended";
  return "current";
}
function range(page: number, pageSize: number) {
  const current = Math.max(1, page);
  return {
    current,
    from: (current - 1) * pageSize,
    to: current * pageSize - 1,
  };
}

export const getMinistryContext = cache(
  async (ministryId: string): Promise<MinistryContext | null> => {
    await requireLeader();
    const church = await getActiveChurch();
    if (!church) return null;
    const supabase = await createClient();
    const { data } = await supabase
      .from("ministry")
      .select("id, name, slug, accent_color, icon_key")
      .eq("id", ministryId)
      .eq("church_id", church.id)
      .maybeSingle();
    return data
      ? {
          church: { id: church.id, name: church.name },
          ministry: {
            id: data.id,
            name: data.name,
            slug: data.slug,
            accentColor: data.accent_color,
            iconKey: data.icon_key,
          },
        }
      : null;
  },
);
export const getTermContext = cache(
  async (ministryId: string, termId: string): Promise<TermContext | null> => {
    const context = await getMinistryContext(ministryId);
    if (!context) return null;
    const supabase = await createClient();
    const { data } = await supabase
      .from("ministry_term")
      .select("id, name, slug, start_date, end_date")
      .eq("id", termId)
      .eq("ministry_id", ministryId)
      .maybeSingle();
    return data
      ? {
          ...context,
          term: {
            id: data.id,
            name: data.name,
            slug: data.slug,
            startDate: data.start_date,
            endDate: data.end_date,
          },
        }
      : null;
  },
);
export async function getMinistries(params: {
  q: string;
  page: number;
  pageSize: number;
  sort: "name-asc" | "name-desc";
}): Promise<PageResult<MinistryItem>> {
  await requireLeader();
  const church = await getActiveChurch();
  if (!church)
    return {
      items: [],
      count: 0,
      page: 1,
      pageSize: safePageSize(params.pageSize),
    };
  const supabase = await createClient();
  const pageSize = safePageSize(params.pageSize);
  const { current } = range(params.page, pageSize);
  const q = normalizedSearch(params.q);
  let countQuery = supabase
    .from("ministry")
    .select("id", { count: "exact", head: true })
    .eq("church_id", church.id);
  if (q) countQuery = countQuery.ilike("name", `%${q}%`);
  const { count, error: countError } = await countQuery;
  if (countError) throw new Error("Failed to fetch ministries");
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const page = Math.min(current, totalPages);
  const { from, to } = range(page, pageSize);
  let query = supabase
    .from("ministry")
    .select("id, name, slug, accent_color, icon_key, ministry_term(count)")
    .eq("church_id", church.id);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data, error } = await query
    .order("name", { ascending: params.sort === "name-asc" })
    .order("id", { ascending: true })
    .range(from, to);
  if (error) throw new Error("Failed to fetch ministries");
  return {
    items: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      accentColor: row.accent_color,
      iconKey: row.icon_key,
      termCount:
        (row as unknown as { ministry_term: { count: number }[] })
          .ministry_term?.[0]?.count ?? 0,
    })),
    count: count ?? 0,
    page,
    pageSize,
  };
}
export async function getTerms(
  ministryId: string,
  params: {
    q: string;
    page: number;
    pageSize: number;
    status: "all" | "current" | "upcoming" | "ended";
    sort: "start-desc" | "start-asc" | "name-asc";
  },
): Promise<PageResult<TermItem>> {
  await requireLeader();
  const context = await getMinistryContext(ministryId);
  const pageSize = safePageSize(params.pageSize);
  if (!context) return { items: [], count: 0, page: 1, pageSize };
  const supabase = await createClient();
  const { current } = range(params.page, pageSize);
  const q = normalizedSearch(params.q);
  let countQuery = supabase
    .from("ministry_term")
    .select("id", { count: "exact", head: true })
    .eq("ministry_id", ministryId);
  if (q) countQuery = countQuery.ilike("name", `%${q}%`);
  const today = todayInHoChiMinh();
  if (params.status === "upcoming")
    countQuery = countQuery.gt("start_date", today);
  if (params.status === "ended") countQuery = countQuery.lt("end_date", today);
  if (params.status === "current")
    countQuery = countQuery.or(
      `and(start_date.lte.${today},end_date.gte.${today}),and(start_date.is.null,end_date.gte.${today}),and(start_date.lte.${today},end_date.is.null)`,
    );
  const { count, error: countError } = await countQuery;
  if (countError) throw new Error("Failed to fetch terms");
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const page = Math.min(current, totalPages);
  const { from, to } = range(page, pageSize);
  let query = supabase
    .from("ministry_term")
    .select("id, name, slug, start_date, end_date")
    .eq("ministry_id", ministryId);
  if (q) query = query.ilike("name", `%${q}%`);
  if (params.status !== "all") {
    if (params.status === "upcoming") query = query.gt("start_date", today);
    if (params.status === "ended") query = query.lt("end_date", today);
    if (params.status === "current")
      query = query.or(
        `and(start_date.lte.${today},end_date.gte.${today}),and(start_date.is.null,end_date.gte.${today}),and(start_date.lte.${today},end_date.is.null)`,
      );
  }
  if (params.sort === "name-asc")
    query = query.order("name", { ascending: true }).order("id");
  else
    query = query
      .order("start_date", {
        ascending: params.sort === "start-asc",
        nullsFirst: false,
      })
      .order("id");
  const { data, error } = await query.range(from, to);
  if (error) throw new Error("Failed to fetch terms");
  return {
    items: (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      startDate: r.start_date,
      endDate: r.end_date,
      status: termStatus(r.start_date, r.end_date),
    })),
    count: count ?? 0,
    page,
    pageSize,
  };
}
export async function getStructure(
  ministryId: string,
  termId: string,
  section: "groups" | "departments",
  params: { q: string; page: number; pageSize: number },
): Promise<PageResult<StructureItem>> {
  await requireLeader();
  const context = await getTermContext(ministryId, termId);
  const pageSize = safePageSize(params.pageSize);
  if (!context) return { items: [], count: 0, page: 1, pageSize };
  const supabase = await createClient();
  const { current } = range(params.page, pageSize);
  const q = normalizedSearch(params.q);
  let countQuery = supabase
    .from(section === "groups" ? "term_group" : "term_department")
    .select("id", { count: "exact", head: true })
    .eq("ministry_term_id", termId);
  if (q) countQuery = countQuery.ilike("name", `%${q}%`);
  const { count, error: countError } = await countQuery;
  if (countError) throw new Error("Failed to fetch term structure");
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const page = Math.min(current, totalPages);
  const { from, to } = range(page, pageSize);
  let query = supabase
    .from(section === "groups" ? "term_group" : "term_department")
    .select("id, name")
    .eq("ministry_term_id", termId);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data, error } = await query.order("name").order("id").range(from, to);
  if (error) throw new Error("Failed to fetch term structure");
  return {
    items: data ?? [],
    count: count ?? 0,
    page,
    pageSize,
  };
}
