import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AttendanceManagement } from "@/features/session/components/attendance-management";
import { getSessionDetail } from "@/features/session/queries";
export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSessionDetail(sessionId);
  if (!session) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <AdminPageHeader
        title={session.title}
        description={`${session.ministryName} · ${session.termName} · ${session.sessionDate}`}
      />
      <AttendanceManagement session={session} />
    </div>
  );
}
