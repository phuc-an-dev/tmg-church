import type { Metadata } from "next";
import { format, isValid, parseISO } from "date-fns";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SessionManagement } from "@/features/session/components/session-management";
import {
  getSessionCalendarMonth,
  getSessions,
  getSessionTerms,
} from "@/features/session/queries";
import { sessionSearchParamsCache } from "@/features/session/search-params";
export const metadata: Metadata = {
  title: "Sessions",
  description: "Manage ministry term sessions and attendance",
};
export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const p = await sessionSearchParamsCache.parse(searchParams);
  const currentMonth = format(new Date(), "yyyy-MM");
  const calendarMonth =
    /^\d{4}-\d{2}$/.test(p.month) && isValid(parseISO(`${p.month}-01`))
      ? p.month
      : currentMonth;
  const [result, terms, calendarSessions] = await Promise.all([
    p.view === "list"
      ? getSessions({
          q: p.q,
          term: p.term,
          page: Math.max(1, p.page),
          pageSize: p.pageSize,
        })
      : Promise.resolve({ items: [], count: 0, page: 1, pageSize: p.pageSize }),
    getSessionTerms(),
    p.view === "overview"
      ? getSessionCalendarMonth(calendarMonth)
      : Promise.resolve([]),
  ]);
  const today = format(new Date(), "yyyy-MM-dd");
  const selectedCalendarDate =
    (p.date && calendarSessions.some((item) => item.sessionDate === p.date)
      ? p.date
      : calendarSessions.find((item) => item.sessionDate >= today)
          ?.sessionDate) ??
    calendarSessions[0]?.sessionDate ??
    "";
  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Sessions"
        description="Create one-off ministry term sessions and record attendance."
      />
      <SessionManagement
        result={result}
        terms={terms}
        calendarMonth={calendarMonth}
        calendarSessions={calendarSessions}
        selectedCalendarDate={selectedCalendarDate}
      />
    </AdminPageContainer>
  );
}
