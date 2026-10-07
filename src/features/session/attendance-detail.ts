import type {
  SessionDetail,
  SessionItem,
  SessionParticipantDetail,
  SessionFilterStatus,
} from "./types";

export type AttendanceFilters = {
  q?: string;
  status?: SessionFilterStatus;
  page?: number;
  pageSize?: number;
};

export function buildSessionAttendanceDetail(
  session: SessionItem,
  participants: SessionParticipantDetail[],
  filters: AttendanceFilters = {},
): SessionDetail {
  const q = filters.q?.trim().toLocaleLowerCase() ?? "";
  const filteredParticipants = participants.filter((participant) => {
    if (q && !participant.fullName.toLocaleLowerCase().includes(q))
      return false;
    if (filters.status === "pending") return participant.status === null;
    if (filters.status && filters.status !== "all")
      return participant.status === filters.status;
    return true;
  });
  const pageSize = [20, 50, 100].includes(filters.pageSize ?? 20)
    ? (filters.pageSize ?? 20)
    : 20;
  const count = filteredParticipants.length;
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const page = Math.min(Math.max(1, filters.page ?? 1), pageCount);
  const pageParticipants = filteredParticipants.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const summary = participants.reduce(
    (counts, participant) => {
      if (participant.status) counts.recordedCount += 1;
      else counts.pendingCount += 1;
      if (participant.status === "present") counts.presentCount += 1;
      if (participant.status === "absent") counts.absentCount += 1;
      if (participant.status === "excused") counts.excusedCount += 1;
      return counts;
    },
    {
      enrolledCount: participants.length,
      recordedCount: 0,
      presentCount: 0,
      absentCount: 0,
      excusedCount: 0,
      pendingCount: 0,
    },
  );
  return {
    ...session,
    summary,
    participants: pageParticipants,
    count,
    page,
    pageSize,
    filteredMemberIds: filteredParticipants.map(
      (participant) => participant.memberId,
    ),
  };
}
