"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { StatusToast } from "@/components/ui/status-toast";
import { Button } from "@/components/ui/button";
import { savePortalDepartmentAttendanceAction } from "./department-session-actions";
import type { PortalDepartmentSessionDetail } from "./department-session-queries";

export function PortalDepartmentSessionDetailView({
  session,
  canManage,
  backPath,
}: {
  session: PortalDepartmentSessionDetail;
  canManage: boolean;
  backPath: string;
}) {
  const [rows, setRows] = React.useState(session.members);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState("");
  async function setStatus(
    memberId: string,
    status: "present" | "absent" | "excused",
  ) {
    setPendingId(memberId);
    const result = await savePortalDepartmentAttendanceAction({
      sessionId: session.id,
      memberId,
      status,
    });
    setPendingId(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to save attendance.");
    setRows((current) =>
      current.map((row) => (row.id === memberId ? { ...row, status } : row)),
    );
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <AdminPageHeader
          title={session.title}
          description={session.departmentName}
          backLink={{ href: backPath, label: "Sessions" }}
        />
        <p className="text-muted-foreground px-1 text-sm">
          {session.sessionDate}
        </p>

        {rows.length === 0 ? (
          <EmptyState
            icon={Check}
            title="No department members"
            description="Assign members to this department first; they will appear here for attendance."
          />
        ) : (
          <div className="md:divide-border/60 space-y-3 md:divide-y md:overflow-hidden md:rounded-xl md:border">
            {rows.map((member) => (
              <article
                key={member.id}
                className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_60%,transparent)] md:rounded-none md:border-0 md:p-3 md:shadow-none"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <MemberAvatar gender={member.gender} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {member.name}
                    </span>
                    {!canManage && (
                      <span className="text-muted-foreground block text-xs capitalize">
                        {member.status ?? "pending"}
                      </span>
                    )}
                  </span>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    {(["present", "absent", "excused"] as const).map(
                      (status) => (
                        <Button
                          key={status}
                          variant={
                            member.status === status ? "default" : "outline"
                          }
                          className="min-h-11 gap-1.5 capitalize"
                          disabled={pendingId === member.id}
                          onClick={() => void setStatus(member.id, status)}
                        >
                          {member.status === status ? (
                            <Check className="size-4" aria-hidden="true" />
                          ) : null}
                          {status}
                        </Button>
                      ),
                    )}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
      {toast && <StatusToast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
