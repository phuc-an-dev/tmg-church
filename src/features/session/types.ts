export type SessionItem = {
  id: string;
  title: string;
  sessionDate: string;
  termId: string;
  termName: string;
  ministryName: string;
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
  participants: Array<{
    memberId: string;
    fullName: string;
    status: "present" | "absent" | "excused" | null;
  }>;
};
export type SessionTermOption = {
  id: string;
  name: string;
  ministryName: string;
};
