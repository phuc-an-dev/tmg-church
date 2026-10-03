"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Plus, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { FloatingCreateButton } from "@/components/shared/floating-create-button";
import { StatusToast } from "@/components/ui/status-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import {
  ExpandableActionItem,
  ExpandableCoordinatorProvider,
} from "@/components/shared/expandable-action-item";
import { ListTable, ListTableBody } from "@/components/shared/list-table";
import {
  savePortalAttendanceAction,
  savePortalGroupSessionAction,
  deletePortalGroupSessionAction,
} from "./group-session-actions";
import type {
  PortalGroupSession,
  PortalGroupSessionDetail,
} from "./group-session-queries";

export function PortalGroupSessionList({
  group,
  sessions,
  canManage,
  basePath,
}: {
  group: { id: string; name: string; ministryTermId: string };
  sessions: PortalGroupSession[];
  canManage: boolean;
  basePath: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState("");
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState("");
  async function save() {
    setPendingId("save");
    const result = await savePortalGroupSessionAction({
      ministryTermId: group.ministryTermId,
      termGroupId: group.id,
      title,
      sessionDate: date,
    });
    setPendingId(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to save session.");
    setOpen(false);
    setTitle("");
    setDate("");
    window.location.reload();
  }
  async function remove(id: string) {
    setPendingId(id);
    const result = await deletePortalGroupSessionAction({ id });
    setPendingId(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to delete session.");
    window.location.reload();
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <AdminPageHeader
          title={group.name}
          description="Sessions recorded for this group."
          backLink={{ href: "/portal", label: "Portal" }}
          action={
            canManage ? (
              <Button
                className="hidden min-h-11 gap-2 sm:inline-flex"
                onClick={() => setOpen(true)}
              >
                <Plus className="size-4" aria-hidden="true" />
                <span>New session</span>
              </Button>
            ) : undefined
          }
        />

        {sessions.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No sessions yet"
            description="Create the first session for this group to start recording attendance."
            action={
              canManage ? (
                <Button
                  variant="outline"
                  className="bg-card min-h-11 gap-2 px-4"
                  onClick={() => setOpen(true)}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  New session
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ExpandableCoordinatorProvider resetKey={String(pendingId)}>
            <ListTable label="Group sessions">
              <ListTableBody>
                {sessions.map((session) => (
                  <ExpandableActionItem
                    key={session.id}
                    id={`group-session-${session.id}`}
                    name={session.title}
                    onEdit={
                      canManage
                        ? () => router.push(`${basePath}/${session.slug}`)
                        : undefined
                    }
                    editLabel="Open session"
                    onDelete={
                      canManage && session.canDelete
                        ? () => void remove(session.id)
                        : undefined
                    }
                    deleteLabel="Delete session"
                    deleteIcon={Trash2}
                    deleteDisabled={pendingId === session.id}
                    className="p-4 md:grid md:grid-cols-[1fr_44px] md:items-center md:gap-4 md:border-b md:last:border-b-0"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <Link
                        href={`${basePath}/${session.slug}`}
                        className="group/item flex min-w-0 flex-1 items-center gap-3"
                      >
                        <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                          <CalendarDays className="size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="text-foreground block truncate font-semibold group-hover/item:underline">
                            {session.title}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {session.sessionDate} · {session.participantCount}{" "}
                            attendance records
                          </span>
                        </span>
                      </Link>
                      <ExpandableActionItem.Trigger className="md:hidden" />
                    </div>
                    <ExpandableActionItem.MobileActions />
                    <div role="cell" className="hidden justify-end md:flex">
                      <ExpandableActionItem.DesktopActions />
                    </div>
                  </ExpandableActionItem>
                ))}
              </ListTableBody>
            </ListTable>
          </ExpandableCoordinatorProvider>
        )}
      </div>

      {canManage && (
        <FloatingCreateButton onClick={() => setOpen(true)}>
          New session
        </FloatingCreateButton>
      )}

      <ResponsiveEditor
        open={open}
        onOpenChange={setOpen}
        title="Create session"
        description="Create a session for this group."
        footer={
          <>
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => setOpen(false)}
              disabled={pendingId === "save"}
            >
              Cancel
            </Button>
            <Button
              className="min-h-[44px]"
              onClick={() => void save()}
              disabled={pendingId === "save" || !title.trim() || !date}
            >
              Save session
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <Input
            className="h-12 text-base"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Session title"
            aria-label="Session title"
          />
          <DatePicker
            id="portal-group-session-date"
            value={date}
            onChange={setDate}
            placeholder="Select session date"
          />
        </div>
      </ResponsiveEditor>

      {toast && <StatusToast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}

export function PortalGroupSessionDetail({
  session,
  canManage,
  backPath,
}: {
  session: PortalGroupSessionDetail;
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
    const result = await savePortalAttendanceAction({
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
          description={session.groupName}
          backLink={{ href: backPath, label: "Group sessions" }}
        />
        <p className="text-muted-foreground px-1 text-sm">
          {session.sessionDate}
        </p>

        {rows.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No members recorded"
            description="Group members will appear here once they are assigned to this session."
          />
        ) : (
          <div className="md:divide-border/60 space-y-3 md:divide-y md:overflow-hidden md:rounded-xl md:border">
            {rows.map((member) => (
              <article
                key={member.id}
                className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_60%,transparent)] md:rounded-none md:border-0 md:p-3 md:shadow-none"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <MemberAvatar />
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
