export type CareStatus = "open" | "in_progress" | "resolved";
export type CareTab = "open" | "suggestions" | "history";
export type CareFilters = {
  groupSlug: string | null;
  tab: CareTab;
  page: number;
  q: string;
};
export type CareGroup = { id: string; name: string; slug: string };
export type CareScope = {
  termId: string;
  termName: string;
  termSlug: string;
  ministryId: string;
  ministryName: string;
  ministrySlug: string;
  lifecycle: "active" | "closed";
  readOnly: boolean;
  canCoordinate: boolean;
  groups: CareGroup[];
};
export type CareSourceEvidence = {
  sessions?: { id: string; date: string; status: "absent" }[];
  latestSessionDate?: string;
};
export type CareCase = {
  id: string;
  slug: string;
  memberId: string;
  memberName: string;
  termId: string;
  termName: string;
  termSlug: string;
  ministryId: string;
  ministryName: string;
  ministrySlug: string;
  groupId: string | null;
  groupName: string | null;
  groupSlug: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  createdById: string | null;
  resolvedById: string | null;
  status: CareStatus;
  nextContactDate: string | null;
  createdAt: string;
  resolvedAt: string | null;
  source: "manual" | "attendance";
  sourceEvidence: CareSourceEvidence;
  flagType: string;
  readOnly: boolean;
  canCoordinate: boolean;
};
export type CareNote = {
  id: string;
  note: string;
  authorId: string | null;
  authorName: string;
  createdAt: string;
};
export type CareDetail = {
  case: CareCase;
  notes: CareNote[];
  canReadNotes: boolean;
  canUpdate: boolean;
  canAssign: boolean;
  canCoordinate: boolean;
  readOnly: boolean;
};
export type CareSuggestion = {
  memberId: string;
  memberName: string;
  groupId: string;
  groupName: string;
  groupSlug: string;
  termId: string;
  sourceEvidence: {
    sessions: { id: string; date: string; status: "absent" }[];
    latestSessionDate: string;
  };
};
export type CareGroupOptions = {
  members: { id: string; name: string }[];
  assignees: { id: string; name: string }[];
  defaultAssigneeId: string;
};
export type CarePageData = {
  scope: CareScope;
  group: CareGroup | null;
  filters: CareFilters;
  items: CareCase[];
  suggestionItems: CareSuggestion[];
  totalCount: number;
  page: number;
  pageSize: 20;
  currentDate: string;
};
export type CareActionFailure = {
  success: false;
  code:
    "validation" | "forbidden" | "duplicate" | "stale" | "closed" | "unknown";
  error: string;
  fieldErrors?: Record<string, string[]>;
};
export type CareActionResult =
  { success: true; caseId?: string } | CareActionFailure;
export type CareReadResult<T> = { success: true; data: T } | CareActionFailure;
export type CareCreateInput = {
  groupId: string;
  memberId: string;
  assigneeId: string;
  nextContactDate: string | null;
  source: "manual" | "attendance";
};
