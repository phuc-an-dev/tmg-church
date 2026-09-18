import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  requireDepartmentContext,
  requireMinistryContext,
  requireOperationalContext,
  requireTermContext,
} from "@/features/context/queries";
import type { TermOperationalContext } from "@/features/context/queries";
import { normalizedSearch, safePageSize } from "./search-params";
import type {
  DepartmentDetailData,
  DepartmentDetailMember,
  DepartmentServiceRole,
  DepartmentServiceStructure,
  EligibleTermMember,
  MinistryItem,
  PageResult,
  StructureItem,
  TermDetailData,
  TermDetailMember,
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

/**
 * Resolves the one term that is operational today for a ministry.
 *
 * A current term covers the current calendar date. The database prevents
 * dated terms in one ministry from overlapping, so this is unambiguous.
 */
export const getCurrentActiveTerm = cache(
  async (ministrySlug: string): Promise<TermOperationalContext | null> => {
    const context = await requireMinistryContext(ministrySlug);
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
            lifecycle: data.lifecycle as "draft" | "active" | "closed",
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
  const ctx = await requireOperationalContext();
  const supabase = await createClient();
  const pageSize = safePageSize(params.pageSize);
  const { current } = range(params.page, pageSize);
  const q = normalizedSearch(params.q);
  let countQuery = supabase
    .from("ministry")
    .select("id", { count: "exact", head: true })
    .eq("church_id", ctx.church.id);
  if (q) countQuery = countQuery.ilike("name", `%${q}%`);
  const { count, error: countError } = await countQuery;
  if (countError) throw new Error("Failed to fetch ministries");
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const page = Math.min(current, totalPages);
  const { from, to } = range(page, pageSize);
  let query = supabase
    .from("ministry")
    .select("id, name, slug, accent_color, icon_key, ministry_term(count)")
    .eq("church_id", ctx.church.id);
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
        .select("id, ministry_id, slug")
        .in("ministry_id", ministryIds)
        .lte("start_date", currentDate)
        .gte("end_date", currentDate)
    : { data: [], error: null };
  if (currentTermsError) throw new Error("Failed to fetch current terms");
  const currentTermByMinistry = new Map(
    (currentTerms ?? []).map((term) => [term.ministry_id, term]),
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
      currentTermId: currentTermByMinistry.get(row.id)?.id ?? null,
      currentTermSlug: currentTermByMinistry.get(row.id)?.slug ?? null,
    })),
    count: count ?? 0,
    page,
    pageSize,
  };
}
export async function getTerms(
  ministrySlug: string,
  params: {
    q: string;
    page: number;
    pageSize: number;
    lifecycle: "all" | "draft" | "active" | "closed";
    sort: "start-desc" | "start-asc" | "name-asc";
  },
): Promise<PageResult<TermItem>> {
  const context = await requireMinistryContext(ministrySlug);
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
      lifecycle: r.lifecycle as "draft" | "active" | "closed",
    })),
    count: count ?? 0,
    page,
    pageSize,
  };
}
export async function getStructure(
  ministrySlug: string,
  termSlug: string,
  section: "groups" | "departments",
): Promise<PageResult<StructureItem>> {
  const context = await requireTermContext(ministrySlug, termSlug);
  if (!context) return { items: [], count: 0, page: 1, pageSize: 1 };
  const supabase = await createClient();

  if (section === "departments") {
    const { data, error } = await supabase
      .from("term_department")
      .select(
        "id, name, slug, accent_color, icon_key, department_service_role(count), ministry_assignment(count)",
      )
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
      roleCount:
        (
          row as unknown as {
            department_service_role: { count: number }[];
          }
        ).department_service_role?.[0]?.count ?? 0,
      memberCount:
        (
          row as unknown as {
            ministry_assignment: { count: number }[];
          }
        ).ministry_assignment?.[0]?.count ?? 0,
    }));
    return {
      items,
      count: items.length,
      page: 1,
      pageSize: Math.max(1, items.length),
    };
  }

  const { data, error } = await supabase
    .from("term_group")
    .select("id, name, slug, accent_color, icon_key")
    .eq("ministry_term_id", context.term.id)
    .order("name")
    .order("id");
  if (error) throw new Error("Failed to fetch term structure");

  const groupIds = (data ?? []).map((row) => row.id);
  const { data: memberRows, error: memberErr } =
    groupIds.length > 0
      ? await supabase
          .from("term_group_membership")
          .select("term_group_id")
          .in("term_group_id", groupIds)
          .is("ended_at", null)
          .eq("status", "active")
      : { data: [], error: null };

  if (memberErr) throw new Error("Failed to fetch group member counts");

  const memberCountMap = new Map<string, number>();
  for (const m of memberRows ?? []) {
    memberCountMap.set(
      m.term_group_id,
      (memberCountMap.get(m.term_group_id) ?? 0) + 1,
    );
  }

  const items = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    accentColor: row.accent_color,
    iconKey: row.icon_key,
    memberCount: memberCountMap.get(row.id) ?? 0,
  }));
  return {
    items,
    count: items.length,
    page: 1,
    pageSize: Math.max(1, items.length),
  };
}

export async function getDepartmentServiceStructure(
  ministrySlug: string,
  termSlug: string,
  departmentSlug: string,
): Promise<DepartmentServiceStructure | null> {
  const context = await requireTermContext(ministrySlug, termSlug);
  if (!context) return null;
  const supabase = await createClient();

  const { data: dept, error: deptError } = await supabase
    .from("term_department")
    .select("id, name, slug, accent_color, icon_key")
    .eq("ministry_term_id", context.term.id)
    .eq("slug", departmentSlug)
    .maybeSingle();

  if (deptError || !dept) return null;

  const { data: roles, error: rolesError } = await supabase
    .from("department_service_role")
    .select("id, term_department_id, name, service_assignment(count)")
    .eq("term_department_id", dept.id)
    .order("name")
    .order("id");

  if (rolesError) {
    throw new Error("Failed to fetch department service structure");
  }

  return {
    department: {
      id: dept.id,
      name: dept.name,
      slug: dept.slug,
      accentColor: dept.accent_color,
      iconKey: dept.icon_key,
    },
    roles: (roles ?? []).map((r) => ({
      id: r.id,
      termDepartmentId: r.term_department_id,
      name: r.name,
      assignmentCount:
        (r as unknown as { service_assignment: { count: number }[] })
          .service_assignment?.[0]?.count ?? 0,
    })),
  };
}

export async function getDepartmentDetailData(
  ministrySlug: string,
  termSlug: string,
  departmentSlug: string,
): Promise<DepartmentDetailData | null> {
  const context = await requireDepartmentContext(
    ministrySlug,
    termSlug,
    departmentSlug,
  );
  if (!context) return null;
  const supabase = await createClient();

  const [membershipsRes, assignmentsRes, rolesRes, sessionsRes] =
    await Promise.all([
      supabase
        .from("ministry_membership")
        .select("id, member_profile!inner(id, full_name, slug, archived_at)")
        .eq("ministry_term_id", context.term.id)
        .is("member_profile.archived_at", null),
      supabase
        .from("ministry_assignment")
        .select("id, ministry_membership_id")
        .eq("term_department_id", context.department.id),
      supabase
        .from("department_service_role")
        .select("id, term_department_id, name, service_assignment(count)")
        .eq("term_department_id", context.department.id)
        .order("name"),
      supabase
        .from("ministry_session")
        .select(
          "id,slug,title,session_date,session_participant(count),session_assignment(count),service_assignment(count)",
        )
        .eq("term_department_id", context.department.id)
        .order("session_date", { ascending: false }),
    ]);

  if (
    membershipsRes.error ||
    assignmentsRes.error ||
    rolesRes.error ||
    sessionsRes.error
  ) {
    throw new Error("Failed to fetch department detail data");
  }

  const assignmentMap = new Map<string, string>();
  for (const a of assignmentsRes.data ?? []) {
    assignmentMap.set(a.ministry_membership_id, a.id);
  }

  const members: DepartmentDetailMember[] = (membershipsRes.data ?? [])
    .map((m) => {
      const profile = m.member_profile as unknown as {
        id: string;
        full_name: string;
        slug: string;
      };
      const assignmentId = assignmentMap.get(m.id) ?? null;
      return {
        membershipId: m.id,
        memberId: profile.id,
        memberName: profile.full_name,
        memberSlug: profile.slug,
        isAssigned: Boolean(assignmentId),
        assignmentId,
      };
    })
    .sort((a, b) => a.memberName.localeCompare(b.memberName));

  const roles: DepartmentServiceRole[] = (rolesRes.data ?? []).map((r) => ({
    id: r.id,
    termDepartmentId: r.term_department_id,
    name: r.name,
    assignmentCount:
      (r as unknown as { service_assignment: { count: number }[] })
        .service_assignment?.[0]?.count ?? 0,
  }));

  return {
    department: {
      id: context.department.id,
      name: context.department.name,
      slug: context.department.slug,
      accentColor: context.department.accentColor,
      iconKey: context.department.iconKey,
      memberCount: assignmentMap.size,
      roleCount: roles.length,
    },
    members,
    roles,
    sessions: (sessionsRes.data ?? []).map((session) => {
      const participantCount =
        (session.session_participant as unknown as { count: number }[])?.[0]
          ?.count ?? 0;
      const assignmentCount =
        (session.session_assignment as unknown as { count: number }[])?.[0]
          ?.count ?? 0;
      const serviceAssignmentCount =
        (session.service_assignment as unknown as { count: number }[])?.[0]
          ?.count ?? 0;
      return {
        id: session.id,
        slug: session.slug,
        title: session.title,
        sessionDate: session.session_date,
        participantCount,
        canDelete:
          participantCount === 0 &&
          assignmentCount === 0 &&
          serviceAssignmentCount === 0,
      };
    }),
  };
}

export async function getTermDetailData(
  ministrySlug: string,
  termSlug: string,
): Promise<TermDetailData | null> {
  const context = await requireTermContext(ministrySlug, termSlug);
  if (!context) return null;
  const supabase = await createClient();
  const [membershipsRes, profilesRes, sessionsRes, termRolesRes] =
    await Promise.all([
      supabase
        .from("ministry_membership")
        .select("id,member_profile!inner(id,full_name,slug,archived_at)")
        .eq("ministry_term_id", context.term.id)
        .is("member_profile.archived_at", null)
        .order("member_profile(full_name)"),
      supabase
        .from("member_profile")
        .select("id,full_name,slug")
        .eq("church_id", context.church.id)
        .is("archived_at", null)
        .order("full_name"),
      supabase
        .from("ministry_session")
        .select(
          "id,slug,title,session_date,session_participant(count),session_assignment(count),service_assignment(count)",
        )
        .eq("ministry_term_id", context.term.id)
        .is("term_group_id", null)
        .is("term_department_id", null)
        .order("session_date", { ascending: false }),
      supabase
        .from("term_role_assignment")
        .select("id, role, member_profile!inner(id, full_name)")
        .eq("ministry_term_id", context.term.id)
        .order("role"),
    ]);

  if (
    membershipsRes.error ||
    profilesRes.error ||
    sessionsRes.error ||
    termRolesRes.error
  ) {
    throw new Error("Failed to fetch term detail data");
  }

  const members: TermDetailMember[] = (membershipsRes.data ?? []).map((row) => {
    const profile = row.member_profile as unknown as {
      id: string;
      full_name: string;
      slug: string;
    };
    return {
      membershipId: row.id,
      memberId: profile.id,
      memberName: profile.full_name,
      memberSlug: profile.slug,
    };
  });
  const memberIds = new Set(members.map((member) => member.memberId));
  const eligibleMembers: EligibleTermMember[] = (profilesRes.data ?? [])
    .filter((profile) => !memberIds.has(profile.id))
    .map((profile) => ({
      id: profile.id,
      name: profile.full_name,
      slug: profile.slug,
    }));

  return {
    members,
    eligibleMembers,
    termRoles: (termRolesRes.data ?? []).map((row) => {
      const profile = row.member_profile as unknown as {
        id: string;
        full_name: string;
      };
      return {
        id: row.id,
        role: row.role,
        memberId: profile.id,
        memberName: profile.full_name,
      };
    }),
    sessions: (sessionsRes.data ?? []).map((session) => {
      const participantCount =
        (session.session_participant as unknown as { count: number }[])?.[0]
          ?.count ?? 0;
      const assignmentCount =
        (session.session_assignment as unknown as { count: number }[])?.[0]
          ?.count ?? 0;
      const serviceAssignmentCount =
        (session.service_assignment as unknown as { count: number }[])?.[0]
          ?.count ?? 0;
      return {
        id: session.id,
        slug: session.slug,
        title: session.title,
        sessionDate: session.session_date,
        participantCount,
        canDelete:
          participantCount === 0 &&
          assignmentCount === 0 &&
          serviceAssignmentCount === 0,
      };
    }),
  };
}
