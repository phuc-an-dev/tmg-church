import "server-only";
import { cache } from "react";
import {
  addQuarters,
  eachDayOfInterval,
  endOfQuarter,
  format,
  getDay,
  startOfQuarter,
} from "date-fns";
import { requirePortalContext } from "@/features/auth/queries";
import { createClient } from "@/lib/supabase/server";
import { getPortalMemberData } from "./member-session-queries";
import { getPortalDelegatedTerms } from "./term-session-queries";

type PortalWorkspace = {
  id: string;
  kind: "Ministry" | "Department" | "Group" | "Administration";
  name: string;
  context: string;
  href: string;
  accentColor?: string;
  iconKey?: string;
};

type PortalSession = {
  myRoles?: string[];
  id: string;
  title: string;
  scope: string;
  scopeType: "ministry" | "department" | "group";
  date: string;
  href: string;
};

type ReadinessIssue = {
  date: string;
  kind: "missing-session" | "no-roles" | "unassigned-roles";
  title: string;
  href: string;
  canExempt: boolean;
  termId: string;
};

type DepartmentReadiness = {
  id: string;
  name: string;
  termId: string;
  ministrySlug: string;
  termSlug: string;
  departmentSlug: string;
  expectedCount: number;
  scheduledCount: number;
  fullyStaffedCount: number;
  sessionCount: number;
  issues: ReadinessIssue[];
  exemptions: { date: string; reason: string | null }[];
};

export const getPortalDashboardData = cache(
  async function getPortalDashboardData() {
    const context = await requirePortalContext();
    const s = await createClient();
    const groupIds = context.groupRoles.map((role) => role.groupId);
    const [groupsResult, departmentsResult, ministryTerms] = await Promise.all([
      groupIds.length
        ? s
            .from("portal_group_directory")
            .select("id,name,slug,term_slug,ministry_slug")
            .in("id", groupIds)
        : Promise.resolve({ data: [], error: null }),
      s
        .from("portal_department_directory")
        .select(
          "id,name,slug,term_slug,ministry_slug,ministry_term_id,accent_color,icon_key",
        )
        .order("name"),
      getPortalDelegatedTerms(),
    ]);
    if (groupsResult.error) throw new Error("Failed to fetch portal groups");
    if (departmentsResult.error)
      throw new Error("Failed to fetch portal departments");

    const groups = groupsResult.data ?? [];
    const departments = departmentsResult.data ?? [];
    const memberMode =
      !context.isSystemAdmin &&
      !departments.length &&
      !ministryTerms.length &&
      !context.groupRoles.some((role) => role.role !== "member");
    if (memberMode) {
      const memberData = await getPortalMemberData();
      return {
        requests: [],
        requestCount: 0,
        sessions: memberData.sessions,
        workspaces: memberData.workspaces,
        memberMode: true,
        readiness: {
          quarterLabel: "",
          departments: [] as DepartmentReadiness[],
        },
      };
    }
    const departmentById = new Map(departments.map((row) => [row.id, row]));
    const groupById = new Map(groups.map((row) => [row.id, row]));
    const ministryByTermId = new Map(
      ministryTerms.map((row) => [row.ministry_term_id, row]),
    );
    const today = format(new Date(), "yyyy-MM-dd");
    const termIds = ministryTerms.map((term) => term.ministry_term_id);
    const departmentIds = departments.map((department) => department.id);

    const [
      ministrySessionsResult,
      departmentSessionsResult,
      groupSessionsResult,
      requestsResult,
    ] = await Promise.all([
      termIds.length
        ? s
            .from("ministry_session")
            .select("id,slug,title,session_date,ministry_term_id")
            .in("ministry_term_id", termIds)
            .is("term_department_id", null)
            .is("term_group_id", null)
            .gte("session_date", today)
            .order("session_date")
        : Promise.resolve({ data: [], error: null }),
      departmentIds.length
        ? s
            .from("portal_department_session_directory")
            .select("department_id,session_slug,session_title,session_date")
            .in("department_id", departmentIds)
            .gte("session_date", today)
            .order("session_date")
        : Promise.resolve({ data: [], error: null }),
      groupIds.length
        ? s
            .from("ministry_session")
            .select("id,slug,title,session_date,term_group_id")
            .in("term_group_id", groupIds)
            .gte("session_date", today)
            .order("session_date")
        : Promise.resolve({ data: [], error: null }),
      departmentIds.length
        ? s
            .from("portal_department_request_directory")
            .select(
              "department_id,department_name,department_slug,term_slug,ministry_slug,request_id,created_at,requester_name",
            )
            .in("department_id", departmentIds)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (ministrySessionsResult.error)
      throw new Error("Failed to fetch upcoming ministry sessions");
    if (departmentSessionsResult.error)
      throw new Error("Failed to fetch upcoming department sessions");
    if (groupSessionsResult.error)
      throw new Error("Failed to fetch upcoming group sessions");
    if (requestsResult.error)
      throw new Error("Failed to fetch pending department requests");

    const sessions: PortalSession[] = [];
    for (const session of ministrySessionsResult.data ?? []) {
      const term = ministryByTermId.get(session.ministry_term_id);
      if (!term) continue;
      sessions.push({
        id: session.id,
        title: session.title,
        scope: `${term.ministry_name} · ${term.term_name}`,
        scopeType: "ministry",
        date: session.session_date,
        href: `/portal/ministries/${term.ministry_slug}/terms/${term.term_slug}/sessions/${session.slug}`,
      });
    }
    for (const session of departmentSessionsResult.data ?? []) {
      const department = departmentById.get(session.department_id);
      if (!department) continue;
      sessions.push({
        id: session.session_slug,
        title: session.session_title,
        scope: department.name,
        scopeType: "department",
        date: session.session_date,
        href: `/portal/ministries/${department.ministry_slug}/terms/${department.term_slug}/departments/${department.slug}/sessions/${session.session_slug}`,
      });
    }
    for (const session of groupSessionsResult.data ?? []) {
      const group = session.term_group_id
        ? groupById.get(session.term_group_id)
        : undefined;
      if (!group) continue;
      sessions.push({
        id: session.id,
        title: session.title,
        scope: group.name,
        scopeType: "group",
        date: session.session_date,
        href: `/portal/ministries/${group.ministry_slug}/terms/${group.term_slug}/groups/${group.slug}/sessions/${session.slug}`,
      });
    }

    const requests = (requestsResult.data ?? [])
      .filter((row) => row.request_id)
      .map((row) => ({
        id: row.request_id as string,
        title: row.requester_name ?? "Member",
        scope: row.department_name,
        date: row.created_at?.slice(0, 10) ?? "",
        href: `/portal/ministries/${row.ministry_slug}/terms/${row.term_slug}/departments/${row.department_slug}?section=requests`,
      }));

    const quarterStart = startOfQuarter(addQuarters(new Date(), 1));
    const quarterEnd = endOfQuarter(quarterStart);
    const startDate = format(quarterStart, "yyyy-MM-dd");
    const endDate = format(quarterEnd, "yyyy-MM-dd");
    const currentQuarterEnd = format(endOfQuarter(new Date()), "yyyy-MM-dd");
    const sundayDates = eachDayOfInterval({
      start: quarterStart,
      end: quarterEnd,
    })
      .filter((date) => getDay(date) === 0)
      .map((date) => format(date, "yyyy-MM-dd"));
    const readinessRows = await Promise.all(
      ministryTerms.flatMap((term) =>
        departments
          .filter(
            (department) =>
              department.ministry_term_id === term.ministry_term_id,
          )
          .map(async (department): Promise<DepartmentReadiness | null> => {
            const { data: canManageRoles, error: capabilityError } =
              await s.rpc("has_capability", {
                p_capability: "department.service_role.manage",
                p_scope_type: "department",
                p_scope_id: department.id,
              });
            if (capabilityError)
              throw new Error("Failed to check department role access");
            if (!canManageRoles) return null;

            const [readinessResult, currentReadinessResult, exemptionsResult] =
              await Promise.all([
                s.rpc("portal_ministry_quarter_readiness", {
                  p_term_id: term.ministry_term_id,
                  p_department_id: department.id,
                  p_start_date: startDate,
                  p_end_date: endDate,
                }),
                s.rpc("portal_ministry_quarter_readiness", {
                  p_term_id: term.ministry_term_id,
                  p_department_id: department.id,
                  p_start_date: today,
                  p_end_date: currentQuarterEnd,
                }),
                s.rpc("portal_ministry_session_exemptions", {
                  p_term_id: term.ministry_term_id,
                  p_start_date: startDate,
                  p_end_date: endDate,
                }),
              ]);
            if (readinessResult.error)
              throw new Error("Failed to fetch quarterly session readiness");
            if (currentReadinessResult.error)
              throw new Error("Failed to fetch upcoming session assignments");
            if (exemptionsResult.error)
              throw new Error("Failed to fetch session exemptions");

            const exemptions = (exemptionsResult.data ?? []).map((row) => ({
              date: row.session_date,
              reason: row.reason,
            }));
            const exemptDates = new Set(exemptions.map((row) => row.date));
            const expectedDates = sundayDates.filter(
              (date) => !exemptDates.has(date),
            );
            const rowsByDate = new Map<string, typeof readinessResult.data>();
            for (const row of readinessResult.data ?? []) {
              rowsByDate.set(row.session_date, [
                ...(rowsByDate.get(row.session_date) ?? []),
                row,
              ]);
            }

            const issues: ReadinessIssue[] = [];
            for (const date of expectedDates) {
              const daySessions = rowsByDate.get(date) ?? [];
              if (!daySessions.length) {
                issues.push({
                  date,
                  kind: "missing-session",
                  title: "Create ministry session",
                  href: `/portal/ministries/${term.ministry_slug}/terms/${term.term_slug}?date=${date}&createSession=true&fromDepartment=${department.slug}`,
                  canExempt: true,
                  termId: term.ministry_term_id,
                });
                continue;
              }
            }
            for (const session of [
              ...(currentReadinessResult.data ?? []),
              ...(readinessResult.data ?? []),
            ]) {
              if (session.selected_role_count === 0) {
                issues.push({
                  date: session.session_date,
                  kind: "no-roles",
                  title: session.session_title,
                  href: `/portal/ministries/${term.ministry_slug}/terms/${term.term_slug}/sessions/${session.session_slug}?fromDepartment=${department.slug}&from=todo&tab=assignments`,
                  canExempt: false,
                  termId: term.ministry_term_id,
                });
              } else if (
                session.assigned_role_count < session.selected_role_count
              ) {
                issues.push({
                  date: session.session_date,
                  kind: "unassigned-roles",
                  title: session.session_title,
                  href: `/portal/ministries/${term.ministry_slug}/terms/${term.term_slug}/sessions/${session.session_slug}?fromDepartment=${department.slug}&from=todo&tab=assignments`,
                  canExempt: false,
                  termId: term.ministry_term_id,
                });
              }
            }

            const fullyStaffedCount = (readinessResult.data ?? []).filter(
              (session) =>
                session.selected_role_count > 0 &&
                session.assigned_role_count === session.selected_role_count,
            ).length;

            return {
              id: `${term.ministry_term_id}:${department.id}`,
              name: department.name,
              termId: term.ministry_term_id,
              ministrySlug: term.ministry_slug,
              termSlug: term.term_slug,
              departmentSlug: department.slug,
              expectedCount: expectedDates.length,
              scheduledCount: expectedDates.filter((date) =>
                rowsByDate.has(date),
              ).length,
              fullyStaffedCount,
              sessionCount: readinessResult.data?.length ?? 0,
              issues,
              exemptions,
            };
          }),
      ),
    );

    const workspaces: PortalWorkspace[] = [
      ...ministryTerms.map((term) => ({
        id: term.ministry_term_id,
        kind: "Ministry" as const,
        name: term.ministry_name,
        context: term.term_name,
        href: `/portal/ministries/${term.ministry_slug}/terms/${term.term_slug}`,
        accentColor: term.accent_color,
        iconKey: term.icon_key,
      })),
      ...departments.map((department) => ({
        id: department.id,
        kind: "Department" as const,
        name: department.name,
        context: `${department.ministry_slug} · ${department.term_slug}`,
        href: `/portal/ministries/${department.ministry_slug}/terms/${department.term_slug}/departments/${department.slug}?section=members`,
        accentColor: department.accent_color,
        iconKey: department.icon_key,
      })),
      ...groups.map((group) => ({
        id: group.id,
        kind: "Group" as const,
        name: group.name,
        context: `${group.ministry_slug} · ${group.term_slug}`,
        href: `/portal/ministries/${group.ministry_slug}/terms/${group.term_slug}/groups/${group.slug}/sessions`,
      })),
      ...(context.isSystemAdmin
        ? [
            {
              id: "admin",
              kind: "Administration" as const,
              name: "Administration",
              context: "Church management",
              href: "/admin",
            },
          ]
        : []),
    ];

    const memberData = await getPortalMemberData();
    const myRolesBySession = new Map(
      memberData.sessions.map((session) => [session.id, session.myRoles]),
    );
    return {
      memberMode: false,
      requests: requests.slice(0, 3),
      requestCount: requests.length,
      sessions: sessions
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((session) => ({
          ...session,
          myRoles: myRolesBySession.get(session.id) ?? [],
        })),
      workspaces,
      readiness: {
        quarterLabel: format(quarterStart, "QQQ yyyy"),
        departments: readinessRows.filter(
          (row): row is DepartmentReadiness => row !== null,
        ),
      },
    };
  },
);
