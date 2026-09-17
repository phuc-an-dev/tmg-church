import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireOperationalContext } from "@/features/context/queries";
import { isUuid } from "@/lib/slug";
import type {
  SessionDepartmentInfo,
  SessionDepartmentOption,
  SessionDetail,
  SessionEnrolledMember,
  SessionFilterStatus,
  SessionGroupInfo,
  SessionPage,
  SessionParticipantDetail,
  SessionServiceAssignmentData,
  SessionServiceAssignment,
  SessionTermOption,
} from "./types";

function safePageSize(value: number) {
  return value === 50 || value === 100 ? value : 20;
}

export async function getSessionTerms(): Promise<SessionTermOption[]> {
  const ctx = await requireOperationalContext();
  const s = await createClient();
  const { data, error } = await s
    .from("ministry_term")
    .select("id,name,slug,ministry!inner(church_id,name,slug)")
    .eq("ministry.church_id", ctx.church.id)
    .order("name");
  if (error) {
    console.error("Failed to fetch session terms:", error);
    throw new Error("Failed to fetch session terms");
  }
  return (data ?? []).map((x) => {
    const ministry = x.ministry as unknown as { name: string; slug: string };
    return {
      id: x.id,
      slug: x.slug,
      ministrySlug: ministry.slug,
      routeKey: `${ministry.slug}/${x.slug}`,
      name: x.name,
      ministryName: ministry.name,
    };
  });
}

export async function getSessions(p: {
  q: string;
  term: string;
  page: number;
  pageSize: number;
}): Promise<SessionPage> {
  const [ctx, terms] = await Promise.all([
    requireOperationalContext(),
    getSessionTerms(),
  ]);
  const selectedTerm = p.term
    ? terms.find((term) => term.routeKey === p.term)
    : null;
  const ids = p.term
    ? selectedTerm
      ? [selectedTerm.id]
      : []
    : terms.map((x) => x.id);
  const pageSize = safePageSize(p.pageSize);
  if (!ids.length) return { items: [], count: 0, page: 1, pageSize };
  const s = await createClient();
  let q = s
    .from("ministry_session")
    .select(
      "id,slug,title,session_date,ministry_term_id,session_participant(count),session_assignment(count),service_assignment(count)",
      { count: "exact" },
    )
    .in("ministry_term_id", ids)
    .eq("church_id", ctx.church.id)
    .order("session_date", { ascending: false })
    .order("id");
  if (p.q.trim()) q = q.ilike("title", `%${p.q.trim()}%`);
  const page = Math.max(1, p.page);
  const { data, count, error } = await q.range(
    (page - 1) * pageSize,
    page * pageSize - 1,
  );
  if (error) {
    console.error("Failed to fetch sessions:", error);
    throw new Error("Failed to fetch sessions");
  }
  const byId = new Map(terms.map((x) => [x.id, x]));
  return {
    items: (data ?? []).map((x) => {
      const t = byId.get(x.ministry_term_id)!;
      const participants =
        (x.session_participant as unknown as { count: number }[])?.[0]?.count ??
        0;
      const assignments =
        (x.session_assignment as unknown as { count: number }[])?.[0]?.count ??
        0;
      const serviceAssignments =
        (x.service_assignment as unknown as { count: number }[])?.[0]?.count ??
        0;
      return {
        id: x.id,
        slug: x.slug,
        title: x.title,
        sessionDate: x.session_date,
        termId: x.ministry_term_id,
        termName: t.name,
        ministryName: t.ministryName,
        participantCount: participants,
        canDelete:
          participants === 0 && assignments === 0 && serviceAssignments === 0,
      };
    }),
    count: count ?? 0,
    page,
    pageSize,
  };
}

export async function getSessionDetail(
  slug: string,
  filterParams?: {
    q?: string;
    status?: SessionFilterStatus;
    page?: number;
    pageSize?: number;
  },
): Promise<SessionDetail | null> {
  if (isUuid(slug)) return null;
  const ctx = await requireOperationalContext();
  const s = await createClient();
  const { data: raw, error: sessionError } = await s
    .from("ministry_session")
    .select(
      "id,slug,title,session_date,ministry_term_id,term_group_id,ministry_term!inner(name,ministry!inner(name)),session_participant(count),session_assignment(count),service_assignment(count)",
    )
    .eq("slug", slug)
    .eq("church_id", ctx.church.id)
    .maybeSingle();
  if (sessionError) {
    console.error("Failed to fetch session:", sessionError);
    throw new Error("Failed to fetch session");
  }
  if (!raw) return null;

  const termData = raw.ministry_term as unknown as
    | { name: string; ministry: { name: string } | { name: string }[] }
    | { name: string; ministry: { name: string } | { name: string }[] }[];
  const singleTerm = Array.isArray(termData) ? termData[0] : termData;
  const singleMinistry = Array.isArray(singleTerm?.ministry)
    ? singleTerm?.ministry[0]
    : singleTerm?.ministry;
  const termName = singleTerm?.name ?? "";
  const ministryName = singleMinistry?.name ?? "";

  const participantCount =
    (raw.session_participant as unknown as { count: number }[])?.[0]?.count ??
    0;
  const assignmentCount =
    (raw.session_assignment as unknown as { count: number }[])?.[0]?.count ?? 0;
  const serviceAssignmentCount =
    (raw.service_assignment as unknown as { count: number }[])?.[0]?.count ?? 0;
  const item = {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    sessionDate: raw.session_date,
    termId: raw.ministry_term_id,
    termName,
    ministryName,
    participantCount,
    canDelete:
      participantCount === 0 &&
      assignmentCount === 0 &&
      serviceAssignmentCount === 0,
  };

  // Fetch all active enrolled members of this term
  const { data: memberships, error: membershipError } = await s
    .from("ministry_membership")
    .select(
      "id,member_profile_id,member_profile!inner(id,full_name,archived_at)",
    )
    .eq("ministry_term_id", item.termId)
    .is("member_profile.archived_at", null)
    .order("member_profile(full_name)");

  if (membershipError) {
    console.error("Failed to fetch session participants:", membershipError);
    throw new Error("Failed to fetch session participants");
  }

  const membershipIds = (memberships ?? []).map((m) => m.id);

  // Concurrently fetch group memberships, department assignments, and session attendance
  const [groupRes, assignRes, attendanceRes] = await Promise.all([
    membershipIds.length > 0
      ? s
          .from("term_group_membership")
          .select(
            "ministry_membership_id,status,term_group:term_group_id(id,name,accent_color,icon_key)",
          )
          .in("ministry_membership_id", membershipIds)
          .is("ended_at", null)
      : Promise.resolve({ data: [] }),
    membershipIds.length > 0
      ? s
          .from("ministry_assignment")
          .select(
            "ministry_membership_id,term_department:term_department_id(id,name,accent_color,icon_key)",
          )
          .in("ministry_membership_id", membershipIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    s
      .from("session_participant")
      .select("member_profile_id,attendance_record(status)")
      .eq("ministry_session_id", raw.id),
  ]);

  const groupByMembership = new Map<string, SessionGroupInfo>();
  const groupStatusByMembership = new Map<string, string>();
  for (const row of groupRes.data ?? []) {
    const tg = Array.isArray(row.term_group)
      ? row.term_group[0]
      : row.term_group;
    if (tg) {
      groupByMembership.set(row.ministry_membership_id, {
        id: tg.id,
        name: tg.name,
        accentColor: tg.accent_color,
        iconKey: tg.icon_key,
      });
      groupStatusByMembership.set(row.ministry_membership_id, row.status);
    }
  }

  const deptsByMembership = new Map<string, SessionDepartmentInfo[]>();
  for (const row of assignRes.data ?? []) {
    const dept = Array.isArray(row.term_department)
      ? row.term_department[0]
      : row.term_department;
    if (dept) {
      const list = deptsByMembership.get(row.ministry_membership_id) ?? [];
      list.push({
        id: dept.id,
        name: dept.name,
        accentColor: dept.accent_color,
        iconKey: dept.icon_key,
      });
      deptsByMembership.set(row.ministry_membership_id, list);
    }
  }

  const statusByMember = new Map<string, "present" | "absent" | "excused">();
  for (const row of attendanceRes.data ?? []) {
    const rec = Array.isArray(row.attendance_record)
      ? row.attendance_record[0]
      : row.attendance_record;
    if (rec?.status) {
      statusByMember.set(
        row.member_profile_id,
        rec.status as "present" | "absent" | "excused",
      );
    }
  }

  // Calculate summary counts across enrolled eligible members
  let presentCount = 0;
  let absentCount = 0;
  let excusedCount = 0;

  const termGroupId = raw.term_group_id;
  const eligibleMemberships = (memberships ?? []).filter((m) => {
    if (!termGroupId) return true;
    const group = groupByMembership.get(m.id);
    const isGroupActive =
      group?.id === termGroupId &&
      groupStatusByMembership.get(m.id) === "active";
    const hasExistingAttendance = statusByMember.has(m.member_profile_id);
    return isGroupActive || hasExistingAttendance;
  });

  const allParticipants: SessionParticipantDetail[] = eligibleMemberships.map(
    (m) => {
      const profile = m.member_profile as unknown as {
        id: string;
        full_name: string;
      };
      const status = statusByMember.get(m.member_profile_id) ?? null;
      if (status === "present") presentCount += 1;
      else if (status === "absent") absentCount += 1;
      else if (status === "excused") excusedCount += 1;

      return {
        memberId: m.member_profile_id,
        fullName: profile.full_name,
        status,
        group: groupByMembership.get(m.id) ?? null,
        departments: deptsByMembership.get(m.id) ?? [],
      };
    },
  );

  const enrolledCount = allParticipants.length;
  const recordedCount = presentCount + absentCount + excusedCount;
  const pendingCount = enrolledCount - recordedCount;

  const summary = {
    enrolledCount,
    recordedCount,
    presentCount,
    absentCount,
    excusedCount,
    pendingCount,
  };

  // Filter according to params
  const q = (filterParams?.q ?? "").trim().toLowerCase();
  const statusFilter: SessionFilterStatus = filterParams?.status ?? "pending";

  let filtered = allParticipants;

  if (q) {
    filtered = filtered.filter((p) => p.fullName.toLowerCase().includes(q));
  }

  if (statusFilter !== "all") {
    filtered = filtered.filter((p) => {
      if (statusFilter === "pending") return p.status === null;
      return p.status === statusFilter;
    });
  }

  const filteredMemberIds = filtered.map((p) => p.memberId);
  const pageSize = safePageSize(filterParams?.pageSize ?? 20);
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const requestedPage = Math.max(1, filterParams?.page ?? 1);
  const page = Math.min(requestedPage, totalPages);

  const slicedParticipants = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  return {
    ...item,
    summary,
    participants: slicedParticipants,
    count: totalCount,
    page,
    pageSize,
    filteredMemberIds,
  };
}

export async function getSessionServiceAssignmentData(
  slug: string,
): Promise<SessionServiceAssignmentData | null> {
  if (isUuid(slug)) return null;
  const ctx = await requireOperationalContext();
  const s = await createClient();

  const { data: raw, error: sessionError } = await s
    .from("ministry_session")
    .select(
      "id,slug,title,session_date,ministry_term_id,ministry_term!inner(slug,name,ministry!inner(slug,name)),session_participant(count),session_assignment(count),service_assignment(count)",
    )
    .eq("slug", slug)
    .eq("church_id", ctx.church.id)
    .maybeSingle();

  if (sessionError || !raw) return null;

  const termData = raw.ministry_term as unknown as
    | {
        slug: string;
        name: string;
        ministry:
          { slug: string; name: string } | { slug: string; name: string }[];
      }
    | {
        slug: string;
        name: string;
        ministry:
          { slug: string; name: string } | { slug: string; name: string }[];
      }[];
  const singleTerm = Array.isArray(termData) ? termData[0] : termData;
  const singleMinistry = Array.isArray(singleTerm?.ministry)
    ? singleTerm?.ministry[0]
    : singleTerm?.ministry;

  const ministrySlug = singleMinistry?.slug ?? "";
  const termSlug = singleTerm?.slug ?? "";

  const participantCount =
    (raw.session_participant as unknown as { count: number }[])?.[0]?.count ??
    0;
  const assignmentCount =
    (raw.session_assignment as unknown as { count: number }[])?.[0]?.count ?? 0;
  const serviceAssignmentCount =
    (raw.service_assignment as unknown as { count: number }[])?.[0]?.count ?? 0;

  const sessionItem = {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    sessionDate: raw.session_date,
    termId: raw.ministry_term_id,
    termName: singleTerm?.name ?? "",
    ministryName: singleMinistry?.name ?? "",
    participantCount,
    canDelete:
      participantCount === 0 &&
      assignmentCount === 0 &&
      serviceAssignmentCount === 0,
  };

  const [deptRes, memberRes, assignRes] = await Promise.all([
    s
      .from("term_department")
      .select(
        "id, name, slug, accent_color, icon_key, department_service_role(id, name)",
      )
      .eq("ministry_term_id", sessionItem.termId)
      .order("name"),
    s
      .from("ministry_membership")
      .select(
        "id, member_profile_id, member_profile!inner(id, full_name, slug, archived_at), ministry_assignment(term_department(id, name))",
      )
      .eq("ministry_term_id", sessionItem.termId)
      .is("member_profile.archived_at", null)
      .order("member_profile(full_name)"),
    s
      .from("service_assignment")
      .select(
        `id,
         department_service_role_id,
         department_service_role!inner(id, name, term_department_id, term_department!inner(id, name)),
         ministry_membership_id,
         ministry_membership!inner(id, member_profile!inner(id, full_name, slug))`,
      )
      .eq("ministry_session_id", sessionItem.id)
      .order("created_at", { ascending: true }),
  ]);

  if (deptRes.error || memberRes.error || assignRes.error) {
    console.error(
      "Failed to fetch session service assignment data:",
      deptRes.error || memberRes.error || assignRes.error,
    );
    throw new Error("Failed to fetch session service assignment data");
  }

  const departments: SessionDepartmentOption[] = (deptRes.data ?? []).map(
    (d) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      accentColor: d.accent_color,
      iconKey: d.icon_key,
      roles: (
        (d.department_service_role as unknown as {
          id: string;
          name: string;
        }[]) ?? []
      ).sort((a, b) => a.name.localeCompare(b.name)),
    }),
  );

  const enrolledMembers: SessionEnrolledMember[] = (memberRes.data ?? []).map(
    (m) => {
      const profile = Array.isArray(m.member_profile)
        ? m.member_profile[0]
        : m.member_profile;
      const assignments =
        (m.ministry_assignment as unknown as {
          term_department: { id: string; name: string };
        }[]) ?? [];
      const deptIds = assignments
        .map((a) => a?.term_department?.id)
        .filter(Boolean);
      const deptNames = assignments
        .map((a) => a?.term_department?.name)
        .filter(Boolean);

      return {
        membershipId: m.id,
        memberId: profile.id,
        memberName: profile.full_name,
        memberSlug: profile.slug,
        departmentIds: deptIds,
        departmentNames: deptNames,
      };
    },
  );

  const assignments: SessionServiceAssignment[] = (assignRes.data ?? []).map(
    (a) => {
      const role = a.department_service_role as unknown as {
        id: string;
        name: string;
        term_department_id: string;
        term_department: { id: string; name: string };
      };
      const membership = a.ministry_membership as unknown as {
        id: string;
        member_profile: { id: string; full_name: string; slug: string };
      };

      return {
        id: a.id,
        departmentServiceRoleId: a.department_service_role_id,
        departmentServiceRoleName: role.name,
        termDepartmentId: role.term_department.id,
        termDepartmentName: role.term_department.name,
        ministryMembershipId: a.ministry_membership_id,
        memberId: membership.member_profile.id,
        memberName: membership.member_profile.full_name,
        memberSlug: membership.member_profile.slug,
      };
    },
  );

  return {
    session: sessionItem,
    ministrySlug,
    termSlug,
    departments,
    assignments,
    enrolledMembers,
  };
}
