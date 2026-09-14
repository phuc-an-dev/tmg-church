import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireLeader } from "@/features/auth/queries";
import { getActiveChurch } from "@/features/church/queries";
import {
  DEFAULT_MEMBER_PAGE_SIZE,
  MEMBER_PAGE_SIZES,
  normalizeMemberSearch,
} from "./search-params";
import { memberIdSchema } from "./schemas";
import type {
  AvailableMinistryTerm,
  MemberDetailData,
  MemberDetailOptions,
  MemberItem,
  MemberPageResult,
  MemberProfileDetail,
  MinistryAssignmentItem,
  MinistryMembershipItem,
  TermDepartmentOption,
  TermGroupOption,
} from "./types";

function pageRange(page: number, pageSize: number) {
  const current = Math.max(1, page);
  return {
    current,
    from: (current - 1) * pageSize,
    to: current * pageSize - 1,
  };
}

function toMemberItem(row: {
  id: string;
  full_name: string;
  phone: string | null;
  birth_year: number | null;
  gender: string | null;
  archived_at: string | null;
}): MemberItem {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    birthYear: row.birth_year,
    gender: row.gender,
    archivedAt: row.archived_at,
    segmentIds: [],
  };
}

export async function getMembers(params: {
  q: string;
  sort: "full_name" | "birth_year";
  order: "asc" | "desc";
  status?: "active" | "archived" | "all";
  segmentSlug?: string;
  page: number;
  pageSize?: number;
}): Promise<MemberPageResult> {
  await requireLeader();
  const church = await getActiveChurch();

  const pageSize =
    params.pageSize &&
    (MEMBER_PAGE_SIZES as readonly number[]).includes(params.pageSize)
      ? params.pageSize
      : DEFAULT_MEMBER_PAGE_SIZE;

  if (!church) {
    return {
      items: [],
      count: 0,
      page: 1,
      pageSize,
    };
  }

  const supabase = await createClient();
  const q = normalizeMemberSearch(params.q);
  const status = params.status ?? "active";
  let segmentMemberIds: string[] | null = null;
  if (params.segmentSlug) {
    const { data: segment } = await supabase
      .from("member_segment")
      .select("id")
      .eq("church_id", church.id)
      .eq("slug", params.segmentSlug)
      .maybeSingle();
    if (!segment) return { items: [], count: 0, page: 1, pageSize };
    const { data: memberships, error: membershipError } = await supabase
      .from("member_segment_membership")
      .select("member_profile_id")
      .eq("member_segment_id", segment.id);
    if (membershipError) throw new Error("Failed to fetch members");
    segmentMemberIds = (memberships ?? []).map(
      (membership) => membership.member_profile_id,
    );
  }

  let countQuery = supabase
    .from("member_profile")
    .select("id", { count: "exact", head: true })
    .eq("church_id", church.id);

  if (status === "active") {
    countQuery = countQuery.is("archived_at", null);
  } else if (status === "archived") {
    countQuery = countQuery.not("archived_at", "is", null);
  }

  if (q) {
    countQuery = countQuery.ilike("full_name", `%${q}%`);
  }
  if (segmentMemberIds) countQuery = countQuery.in("id", segmentMemberIds);

  const { count, error: countError } = await countQuery;
  if (countError) {
    throw new Error("Failed to fetch members");
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const requestedPage = pageRange(params.page, pageSize).current;
  const page = Math.min(requestedPage, totalPages);
  const { from, to } = pageRange(page, pageSize);

  let query = supabase
    .from("member_profile")
    .select("id, full_name, phone, birth_year, gender, archived_at")
    .eq("church_id", church.id);

  if (status === "active") {
    query = query.is("archived_at", null);
  } else if (status === "archived") {
    query = query.not("archived_at", "is", null);
  }

  if (q) {
    query = query.ilike("full_name", `%${q}%`);
  }
  if (segmentMemberIds) query = query.in("id", segmentMemberIds);

  const { data, error } = await query
    .order(params.sort, {
      ascending: params.order === "asc",
      nullsFirst: false,
    })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    throw new Error("Failed to fetch members");
  }

  const items = (data ?? []).map(toMemberItem);
  const { data: segmentMemberships, error: segmentMembershipsError } =
    items.length
      ? await supabase
          .from("member_segment_membership")
          .select("member_profile_id, member_segment_id")
          .in(
            "member_profile_id",
            items.map((member) => member.id),
          )
      : { data: [], error: null };
  if (segmentMembershipsError) throw new Error("Failed to fetch members");
  const segmentIdsByMember = new Map<string, string[]>();
  for (const membership of segmentMemberships ?? []) {
    const ids = segmentIdsByMember.get(membership.member_profile_id) ?? [];
    ids.push(membership.member_segment_id);
    segmentIdsByMember.set(membership.member_profile_id, ids);
  }
  return {
    items: items.map((member) => ({
      ...member,
      segmentIds: segmentIdsByMember.get(member.id) ?? [],
    })),
    count: count ?? 0,
    page,
    pageSize,
  };
}

export async function getMemberForEdit(
  memberId: string,
): Promise<MemberItem | null> {
  if (!memberIdSchema.safeParse(memberId).success) {
    return null;
  }

  await requireLeader();
  const church = await getActiveChurch();
  if (!church) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_profile")
    .select("id, full_name, phone, birth_year, gender, archived_at")
    .eq("id", memberId)
    .eq("church_id", church.id)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to fetch member");
  }

  return data ? toMemberItem(data) : null;
}

export async function getMemberDetail(
  memberId: string,
): Promise<MemberDetailData | null> {
  if (!memberIdSchema.safeParse(memberId).success) {
    return null;
  }

  await requireLeader();
  const church = await getActiveChurch();
  if (!church) return null;

  const supabase = await createClient();

  // 1. Fetch member profile
  const { data: profileRow, error: profileError } = await supabase
    .from("member_profile")
    .select(
      "id, full_name, phone, birth_year, gender, archived_at, created_at, updated_at",
    )
    .eq("id", memberId)
    .eq("church_id", church.id)
    .maybeSingle();

  if (profileError || !profileRow) {
    return null;
  }

  const profile: MemberProfileDetail = {
    id: profileRow.id,
    fullName: profileRow.full_name,
    phone: profileRow.phone,
    birthYear: profileRow.birth_year,
    gender: profileRow.gender,
    archivedAt: profileRow.archived_at,
    createdAt: profileRow.created_at,
    updatedAt: profileRow.updated_at,
  };

  // 2. Fetch ministry memberships with ministry_term and ministry details
  const { data: membershipRows, error: membershipError } = await supabase
    .from("ministry_membership")
    .select(
      `
      id,
      created_at,
      ministry_term:ministry_term_id (
        id,
        name,
        start_date,
        end_date,
        ministry:ministry_id (
          id,
          name,
          church_id,
          accent_color,
          icon_key
        )
      )
    `,
    )
    .eq("member_profile_id", memberId)
    .order("created_at", { ascending: false });

  if (membershipError) {
    throw new Error("Failed to fetch ministry memberships");
  }

  const membershipIds = (membershipRows ?? []).map((row) => row.id);

  // 4. Fetch term_group_membership for these memberships
  const groupMembershipsMap = new Map<
    string,
    {
      id: string;
      groupId: string;
      groupName: string;
      groupColor?: string | null;
      groupIconKey?: string | null;
      createdAt: string;
    }
  >();

  if (membershipIds.length > 0) {
    const { data: groupRows, error: groupError } = await supabase
      .from("term_group_membership")
      .select(
        `
        id,
        ministry_membership_id,
        created_at,
        term_group:term_group_id (
          id,
          name,
          accent_color,
          icon_key
        )
      `,
      )
      .in("ministry_membership_id", membershipIds);

    if (groupError) {
      throw new Error("Failed to fetch group memberships");
    }

    for (const grow of groupRows ?? []) {
      const tg = Array.isArray(grow.term_group)
        ? grow.term_group[0]
        : grow.term_group;
      if (tg) {
        groupMembershipsMap.set(grow.ministry_membership_id, {
          id: grow.id,
          groupId: tg.id,
          groupName: tg.name,
          groupColor: tg.accent_color,
          groupIconKey: tg.icon_key,
          createdAt: grow.created_at,
        });
      }
    }
  }

  // 5. Fetch ministry_assignment for these memberships
  const assignmentsMap = new Map<string, MinistryAssignmentItem[]>();

  if (membershipIds.length > 0) {
    const { data: assignRows, error: assignError } = await supabase
      .from("ministry_assignment")
      .select(
        `
        id,
        ministry_membership_id,
        created_at,
        term_department:term_department_id (
          id,
          name,
          accent_color,
          icon_key
        )
      `,
      )
      .in("ministry_membership_id", membershipIds)
      .order("created_at", { ascending: true });

    if (assignError) {
      throw new Error("Failed to fetch department assignments");
    }

    for (const arow of assignRows ?? []) {
      const dept = Array.isArray(arow.term_department)
        ? arow.term_department[0]
        : arow.term_department;
      if (dept) {
        const list = assignmentsMap.get(arow.ministry_membership_id) ?? [];
        list.push({
          id: arow.id,
          departmentId: dept.id,
          departmentName: dept.name,
          departmentColor: dept.accent_color,
          departmentIconKey: dept.icon_key,
          createdAt: arow.created_at,
        });
        assignmentsMap.set(arow.ministry_membership_id, list);
      }
    }
  }

  // Combine into MinistryMembershipItem list
  const memberships: MinistryMembershipItem[] = [];

  for (const row of membershipRows ?? []) {
    const term = Array.isArray(row.ministry_term)
      ? row.ministry_term[0]
      : row.ministry_term;
    if (!term) continue;

    const ministry = Array.isArray(term.ministry)
      ? term.ministry[0]
      : term.ministry;
    if (!ministry || ministry.church_id !== church.id) continue;

    memberships.push({
      id: row.id,
      ministryId: ministry.id,
      ministryName: ministry.name,
      ministryColor: ministry.accent_color,
      ministryIconKey: ministry.icon_key,
      termId: term.id,
      termName: term.name,
      termStartDate: term.start_date,
      termEndDate: term.end_date,
      createdAt: row.created_at,
      groupMembership: groupMembershipsMap.get(row.id) ?? null,
      assignments: assignmentsMap.get(row.id) ?? [],
    });
  }

  return {
    profile,
    memberships,
  };
}

export async function getMemberDetailOptions(
  activeTermIds: string[],
): Promise<MemberDetailOptions> {
  await requireLeader();
  const church = await getActiveChurch();
  if (!church) {
    return {
      availableTerms: [],
      termGroupsByTermId: {},
      termDepartmentsByTermId: {},
    };
  }

  const supabase = await createClient();

  // Fetch all ministries and terms belonging to church.
  const { data: ministryRows, error: ministryError } = await supabase
    .from("ministry")
    .select(
      `
      id,
      name,
      accent_color,
      icon_key,
      ministry_term (
        id,
        name,
        start_date,
        end_date
      )
    `,
    )
    .eq("church_id", church.id)
    .order("name", { ascending: true });

  if (ministryError) {
    throw new Error("Failed to fetch ministries and terms");
  }

  const availableTerms: AvailableMinistryTerm[] = [];
  const allTermIdsSet = new Set<string>(activeTermIds);

  for (const m of ministryRows ?? []) {
    const terms = Array.isArray(m.ministry_term) ? m.ministry_term : [];
    for (const t of terms) {
      availableTerms.push({
        ministryId: m.id,
        ministryName: m.name,
        ministryColor: m.accent_color,
        ministryIconKey: m.icon_key,
        termId: t.id,
        termName: t.name,
        startDate: t.start_date,
        endDate: t.end_date,
      });
      allTermIdsSet.add(t.id);
    }
  }

  // 3. For all needed terms (both available terms and existing member terms),
  // fetch term groups and term departments
  const neededTermIds = Array.from(allTermIdsSet);
  const termGroupsByTermId: Record<string, TermGroupOption[]> = {};
  const termDepartmentsByTermId: Record<string, TermDepartmentOption[]> = {};

  for (const id of neededTermIds) {
    termGroupsByTermId[id] = [];
    termDepartmentsByTermId[id] = [];
  }

  if (neededTermIds.length > 0) {
    const [groupsRes, deptsRes] = await Promise.all([
      supabase
        .from("term_group")
        .select("id, name, ministry_term_id, accent_color, icon_key")
        .in("ministry_term_id", neededTermIds)
        .order("name", { ascending: true }),
      supabase
        .from("term_department")
        .select("id, name, ministry_term_id, accent_color, icon_key")
        .in("ministry_term_id", neededTermIds)
        .order("name", { ascending: true }),
    ]);

    if (groupsRes.error) {
      throw new Error("Failed to fetch term groups");
    }
    if (deptsRes.error) {
      throw new Error("Failed to fetch term departments");
    }

    for (const g of groupsRes.data ?? []) {
      termGroupsByTermId[g.ministry_term_id]?.push({
        id: g.id,
        name: g.name,
        accentColor: g.accent_color,
        iconKey: g.icon_key,
      });
    }

    for (const d of deptsRes.data ?? []) {
      termDepartmentsByTermId[d.ministry_term_id]?.push({
        id: d.id,
        name: d.name,
        accentColor: d.accent_color,
        iconKey: d.icon_key,
      });
    }
  }

  return {
    availableTerms,
    termGroupsByTermId,
    termDepartmentsByTermId,
  };
}
