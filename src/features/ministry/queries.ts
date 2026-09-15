import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireLeader } from "@/features/auth/queries";
import { getActiveChurch } from "@/features/church/queries";
import { isUuid } from "@/lib/slug";
import { normalizedSearch, safePageSize } from "./search-params";
import type {
  MinistryContext,
  MinistryItem,
  PageResult,
  StructureItem,
  TermContext,
  TermItem,
} from "./types";

function range(page: number, pageSize: number) {
  const current = Math.max(1, page);
  return {
    current,
    from: (current - 1) * pageSize,
    to: current * pageSize - 1,
  };
}

function currentChurchDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export const getMinistryContext = cache(
  async (identifier: string): Promise<MinistryContext | null> => {
    await requireLeader();
    const church = await getActiveChurch();
    if (!church) return null;
    const supabase = await createClient();
    let query = supabase
      .from("ministry")
      .select("id, name, slug, accent_color, icon_key")
      .eq("church_id", church.id);
    query = isUuid(identifier)
      ? query.eq("id", identifier)
      : query.eq("slug", identifier);
    const { data } = await query.maybeSingle();
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
  async (
    ministryIdentifier: string,
    termIdentifier: string,
  ): Promise<TermContext | null> => {
    const context = await getMinistryContext(ministryIdentifier);
    if (!context) return null;
    const supabase = await createClient();
    let query = supabase
      .from("ministry_term")
      .select("id, name, slug, start_date, end_date, lifecycle")
      .eq("ministry_id", context.ministry.id);
    query = isUuid(termIdentifier)
      ? query.eq("id", termIdentifier)
      : query.eq("slug", termIdentifier);
    const { data } = await query.maybeSingle();
    return data
      ? {
          ...context,
          term: {
            id: data.id,
            name: data.name,
            slug: data.slug,
            startDate: data.start_date,
            endDate: data.end_date,
            lifecycle: data.lifecycle,
          },
        }
      : null;
  },
);

/**
 * Resolves the one term that is operational today for a ministry.
 *
 * A current term covers the current calendar date. The database prevents
 * dated terms in one ministry from overlapping, so this is unambiguous.
 */
export const getCurrentActiveTerm = cache(
  async (ministryIdentifier: string): Promise<TermContext | null> => {
    const context = await getMinistryContext(ministryIdentifier);
    if (!context) return null;

    const currentDate = currentChurchDate();

    const supabase = await createClient();
    const { data } = await supabase
      .from("ministry_term")
      .select("id, name, slug, start_date, end_date, lifecycle")
      .eq("ministry_id", context.ministry.id)
      .lte("start_date", currentDate)
      .gte("end_date", currentDate)
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
            lifecycle: data.lifecycle,
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

  const ministries = data ?? [];
  const ministryIds = ministries.map((ministry) => ministry.id);
  const currentDate = currentChurchDate();
  const { data: currentTerms, error: currentTermsError } = ministryIds.length
    ? await supabase
        .from("ministry_term")
        .select("ministry_id, slug")
        .in("ministry_id", ministryIds)
        .lte("start_date", currentDate)
        .gte("end_date", currentDate)
    : { data: [], error: null };
  if (currentTermsError) throw new Error("Failed to fetch current terms");
  const currentTermSlugByMinistry = new Map(
    (currentTerms ?? []).map((term) => [term.ministry_id, term.slug]),
  );

  return {
    items: ministries.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      accentColor: row.accent_color,
      iconKey: row.icon_key,
      termCount:
        (row as unknown as { ministry_term: { count: number }[] })
          .ministry_term?.[0]?.count ?? 0,
      currentTermSlug: currentTermSlugByMinistry.get(row.id) ?? null,
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
    lifecycle: "all" | "draft" | "active" | "closed";
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
    .eq("ministry_id", context.ministry.id);
  if (q) countQuery = countQuery.ilike("name", `%${q}%`);
  if (params.lifecycle !== "all")
    countQuery = countQuery.eq("lifecycle", params.lifecycle);
  const { count, error: countError } = await countQuery;
  if (countError) throw new Error("Failed to fetch terms");
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const page = Math.min(current, totalPages);
  const { from, to } = range(page, pageSize);
  let query = supabase
    .from("ministry_term")
    .select("id, name, slug, start_date, end_date, lifecycle")
    .eq("ministry_id", context.ministry.id);
  if (q) query = query.ilike("name", `%${q}%`);
  if (params.lifecycle !== "all")
    query = query.eq("lifecycle", params.lifecycle);
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
      lifecycle: r.lifecycle,
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
): Promise<PageResult<StructureItem>> {
  await requireLeader();
  const context = await getTermContext(ministryId, termId);
  if (!context) return { items: [], count: 0, page: 1, pageSize: 1 };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(section === "groups" ? "term_group" : "term_department")
    .select("id, name, slug, accent_color, icon_key")
    .eq("ministry_term_id", context.term.id)
    .order("name")
    .order("id");
  if (error) throw new Error("Failed to fetch term structure");
  const items = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    accentColor: row.accent_color,
    iconKey: row.icon_key,
  }));
  return {
    items,
    count: items.length,
    page: 1,
    pageSize: Math.max(1, items.length),
  };
}
