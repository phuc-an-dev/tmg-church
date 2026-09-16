export type ActionResult<T = unknown> =
  | { success: true; data: T; message: string }
  | {
      success: false;
      error: string;
      code: string;
      fieldErrors?: Record<string, string[]>;
    };

export type PageResult<T> = {
  items: T[];
  count: number;
  page: number;
  pageSize: number;
};

export type MinistryItem = {
  id: string;
  name: string;
  slug: string;
  accentColor: string;
  iconKey: string;
  termCount: number;
  currentTermSlug: string | null;
};
export type TermItem = {
  id: string;
  name: string;
  slug: string;
  startDate: string | null;
  endDate: string | null;
  lifecycle: "draft" | "active" | "closed";
};
export type StructureItem = {
  id: string;
  name: string;
  slug: string;
  accentColor: string;
  iconKey: string;
  roleCount?: number;
  memberCount?: number;
};

export type DepartmentDetailMember = {
  membershipId: string;
  memberId: string;
  memberName: string;
  memberSlug: string;
  isAssigned: boolean;
  assignmentId: string | null;
};

export type DepartmentServiceRole = {
  id: string;
  termDepartmentId: string;
  name: string;
  assignmentCount: number;
};

export type DepartmentServiceStructure = {
  department: StructureItem;
  roles: DepartmentServiceRole[];
};

export type DepartmentDetailData = {
  department: StructureItem;
  members: DepartmentDetailMember[];
  roles: DepartmentServiceRole[];
};
