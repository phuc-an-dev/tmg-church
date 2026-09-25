export type SessionAttendanceStatus = "present" | "absent" | "excused";
export type SessionFilterStatus = "all" | "pending" | SessionAttendanceStatus;

export type SessionGroupInfo = {
  id: string;
  name: string;
  accentColor: string | null;
  iconKey: string | null;
};

export type SessionDepartmentInfo = {
  id: string;
  name: string;
  accentColor: string | null;
  iconKey: string | null;
};

export type SessionParticipantDetail = {
  memberId: string;
  fullName: string;
  gender?: string | null;
  status: SessionAttendanceStatus | null;
  group: SessionGroupInfo | null;
  departments: SessionDepartmentInfo[];
  sessionRole?: {
    role: SessionGroupAssignmentRole;
    label: string;
  } | null;
};

export type SessionAttendanceSummary = {
  enrolledCount: number;
  recordedCount: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  pendingCount: number;
};

export type SessionItem = {
  id: string;
  slug: string;
  title: string;
  sessionDate: string;
  termId: string;
  termName: string;
  ministryName: string;
  scopeLabel: string;
  groupId?: string | null;
  departmentId?: string | null;
  participantCount: number;
  canDelete: boolean;
};

export type SessionPage = {
  items: SessionItem[];
  count: number;
  page: number;
  pageSize: number;
};

export type SessionDetail = SessionItem & {
  summary: SessionAttendanceSummary;
  participants: SessionParticipantDetail[];
  count: number;
  page: number;
  pageSize: number;
  filteredMemberIds: string[];
};

export type SessionTermOption = {
  id: string;
  slug: string;
  ministrySlug: string;
  routeKey: string;
  name: string;
  ministryName: string;
};

export type SessionServiceAssignment = {
  id: string;
  departmentServiceRoleId: string;
  departmentServiceRoleName: string;
  termDepartmentId: string;
  termDepartmentName: string;
  ministryMembershipId: string;
  memberId: string;
  memberName: string;
  memberSlug: string;
};

export type SessionEnrolledMember = {
  membershipId: string;
  memberId: string;
  memberName: string;
  memberSlug: string;
  departmentIds: string[];
  departmentNames: string[];
};

export type SessionDepartmentOption = {
  id: string;
  name: string;
  slug: string;
  accentColor: string;
  iconKey: string;
  roles: Array<{ id: string; name: string }>;
};

export type SessionGroupAssignmentRole = "worship_guide" | "lesson_guide";

export type SessionGroupMember = {
  membershipId: string;
  memberName: string;
  memberSlug: string;
  gender?: string | null;
};

export type SessionGroupAssignment = {
  id: string;
  role: SessionGroupAssignmentRole;
  ministryMembershipId: string;
  memberId: string;
  memberName: string;
  memberSlug: string;
  gender?: string | null;
};

export type SessionServiceAssignmentData = {
  session: SessionItem;
  ministrySlug: string;
  termSlug: string;
  scope: "ministry" | "group";
  departments?: SessionDepartmentOption[];
  assignments?: SessionServiceAssignment[];
  enrolledMembers?: SessionEnrolledMember[];
  groupMembers?: SessionGroupMember[];
  groupAssignments?: SessionGroupAssignment[];
};
