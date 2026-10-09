import "server-only";

import { cache } from "react";
import { requirePortalContext } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";
import {
  careFiltersSchema,
  loadCareDetailSchema,
  loadCareGroupOptionsSchema,
} from "./schemas";
import type {
  CareCase,
  CareDetail,
  CareFilters,
  CareGroupOptions,
  CarePageData,
  CareScope,
  CareSuggestion,
} from "./types";

export class CareQueryError extends Error {
  constructor(public readonly code: string) {
    super("Unable to load care data.");
  }
}

function queryError(error: { code: string; message: string }): never {
  throw new CareQueryError(error.code === "P0001" ? error.message : "unknown");
}

export const getCareScopes = cache(async (): Promise<CareScope[]> => {
  await requirePortalContext();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_care_scopes");
  if (error) queryError(error);
  return (data ?? []) as unknown as CareScope[];
});

export async function getCareList(
  ministrySlug: string,
  termSlug: string,
  filters: CareFilters,
): Promise<CarePageData | null> {
  const scopes = await getCareScopes();
  const scope = scopes.find(
    (item) => item.ministrySlug === ministrySlug && item.termSlug === termSlug,
  );
  const parsed = careFiltersSchema.safeParse(filters);
  if (!scope || !parsed.success) return null;
  const group =
    parsed.data.groupSlug === null
      ? null
      : scope.groups.find((item) => item.slug === parsed.data.groupSlug);
  if (
    group === undefined ||
    (scope.readOnly && parsed.data.tab === "suggestions")
  )
    return null;
  const supabase = await createClient();
  // Supabase's generated function arguments omit PostgreSQL parameter nullability.
  const groupId = (group?.id ?? null) as unknown as string;
  const result =
    parsed.data.tab === "suggestions"
      ? await supabase.rpc("get_care_absence_suggestions", {
          p_term_id: scope.termId,
          p_group_id: groupId,
          p_page: parsed.data.page,
        })
      : await supabase.rpc("get_care_list", {
          p_term_id: scope.termId,
          p_group_id: groupId,
          p_tab: parsed.data.tab,
          p_page: parsed.data.page,
          p_query: parsed.data.q,
        });
  if (result.error) queryError(result.error);
  const data = result.data as unknown as {
    items: CareCase[] | CareSuggestion[];
    totalCount: number;
    page: number;
    pageSize: 20;
  };
  const lastPage = Math.max(1, Math.ceil(data.totalCount / data.pageSize));
  if (data.page > lastPage)
    return getCareList(ministrySlug, termSlug, {
      ...parsed.data,
      page: lastPage,
    });
  return {
    scope,
    group,
    filters: parsed.data,
    items: parsed.data.tab === "suggestions" ? [] : (data.items as CareCase[]),
    suggestionItems:
      parsed.data.tab === "suggestions" ? (data.items as CareSuggestion[]) : [],
    totalCount: data.totalCount,
    page: data.page,
    pageSize: data.pageSize,
    currentDate: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date()),
  };
}

export async function getCareDetail(
  ministrySlug: string,
  termSlug: string,
  careSlug: string,
): Promise<CareDetail | null> {
  const scopes = await getCareScopes();
  const input = loadCareDetailSchema.safeParse({
    ministrySlug,
    termSlug,
    careSlug,
  });
  if (
    !input.success ||
    !scopes.some(
      (scope) =>
        scope.ministrySlug === ministrySlug && scope.termSlug === termSlug,
    )
  )
    return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_care_detail_by_slug", {
    p_care_slug: careSlug,
  });
  if (error) {
    if (error.code === "P0001" && error.message === "forbidden") return null;
    queryError(error);
  }
  const detail = data as unknown as CareDetail;
  if (
    !detail ||
    detail.case.ministrySlug !== ministrySlug ||
    detail.case.termSlug !== termSlug
  )
    return null;
  return detail;
}

export async function getCareGroupOptions(
  groupId: string,
): Promise<CareGroupOptions> {
  await requirePortalContext();
  if (!loadCareGroupOptionsSchema.safeParse({ groupId }).success)
    throw new CareQueryError("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_care_group_options", {
    p_group_id: groupId,
  });
  if (error) queryError(error);
  return data as unknown as CareGroupOptions;
}

export async function getCareMutationContext(caseId: string) {
  const scopes = await getCareScopes();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("care_flag")
    .select("id,slug,ministry_term_id,term_group_id")
    .eq("id", caseId)
    .maybeSingle();
  if (error) queryError(error);
  if (!data) return null;
  const scope = scopes.find((item) => item.termId === data.ministry_term_id);
  if (!scope) return null;
  const group =
    scope.groups.find((item) => item.id === data.term_group_id) ?? null;
  if (data.term_group_id && !group) return null;
  return { scope, group, caseSlug: data.slug };
}
