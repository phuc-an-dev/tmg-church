import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AttendanceManagement } from "@/features/session/components/attendance-management";
import { getSessionDetail } from "@/features/session/queries";
import { sessionDetailSearchParamsCache } from "@/features/session/search-params";

export const metadata: Metadata = {
  title: "Session Attendance",
  description: "Record and manage session attendance",
};

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sessionSlug } = await params;
  const filterParams = await sessionDetailSearchParamsCache.parse(searchParams);

  const session = await getSessionDetail(sessionSlug, filterParams);
  if (!session) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <AttendanceManagement session={session} />
    </div>
  );
}
