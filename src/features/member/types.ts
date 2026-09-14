export type MemberStatusFilter = "active" | "archived" | "all";

export interface MemberItem {
  id: string;
  fullName: string;
  phone: string | null;
  birthYear: number | null;
  gender: string | null;
  archivedAt: string | null;
  segmentIds?: string[];
}

export interface MemberPageResult {
  items: MemberItem[];
  count: number;
  page: number;
  pageSize: number;
}

export type MemberActionResult =
  | {
      success: true;
      data: MemberItem;
      message: string;
    }
  | {
      success: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[]>;
    };

export interface MemberProfileDetail extends MemberItem {
  createdAt: string;
  updatedAt: string;
}

export interface TermGroupOption {
  id: string;
  name: string;
  accentColor?: string | null;
  iconKey?: string | null;
}

export interface TermDepartmentOption {
  id: string;
  name: string;
  accentColor?: string | null;
  iconKey?: string | null;
}

export interface MinistryAssignmentItem {
  id: string;
  departmentId: string;
  departmentName: string;
  departmentColor?: string | null;
  departmentIconKey?: string | null;
  createdAt: string;
}

export interface MinistryMembershipItem {
  id: string;
  ministryId: string;
  ministryName: string;
  ministryColor?: string | null;
  ministryIconKey?: string | null;
  termId: string;
  termName: string;
  termStartDate: string | null;
  termEndDate: string | null;
  createdAt: string;
  groupMembership: {
    id: string;
    groupId: string;
    groupName: string;
    groupColor?: string | null;
    groupIconKey?: string | null;
    createdAt: string;
  } | null;
  assignments: MinistryAssignmentItem[];
}

export interface MemberDetailData {
  profile: MemberProfileDetail;
  memberships: MinistryMembershipItem[];
}

export interface AvailableMinistryTerm {
  ministryId: string;
  ministryName: string;
  ministryColor?: string | null;
  ministryIconKey?: string | null;
  termId: string;
  termName: string;
  startDate: string | null;
  endDate: string | null;
}

export interface MemberDetailOptions {
  availableTerms: AvailableMinistryTerm[];
  termGroupsByTermId: Record<string, TermGroupOption[]>;
  termDepartmentsByTermId: Record<string, TermDepartmentOption[]>;
}

export type MutationActionResult<T = void> =
  | {
      success: true;
      data?: T;
      message: string;
    }
  | {
      success: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[]>;
    };
