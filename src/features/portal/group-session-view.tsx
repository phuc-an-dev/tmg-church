"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { DestructiveActionButton } from "@/components/shared/item-action-buttons";
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
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState("");
  const [toast, setToast] = React.useState("");
  async function save() {
    const result = await savePortalGroupSessionAction({
      ministryTermId: group.ministryTermId,
      termGroupId: group.id,
      title,
      sessionDate: date,
    });
    if (!result.success)
      return setToast(result.error ?? "Unable to save session.");
    setOpen(false);
    setTitle("");
    setDate("");
    window.location.reload();
  }
  async function remove(id: string) {
    const result = await deletePortalGroupSessionAction({ id });
    if (!result.success)
      return setToast(result.error ?? "Unable to delete session.");
    window.location.reload();
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Group sessions</p>
          <h1 className="text-2xl font-bold">{group.name}</h1>
        </div>
        {canManage && (
          <Button className="min-h-11 gap-2" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            New session
          </Button>
        )}
      </div>
      {sessions.length === 0 ? (
        <div className="border-border rounded-xl border border-dashed p-10 text-center">
          <CalendarDays className="text-muted-foreground mx-auto size-10" />
          <p className="mt-3 font-medium">No sessions yet</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sessions.map((session) => (
            <article
              key={session.id}
              className="bg-card border-border flex items-center justify-between gap-3 rounded-xl border p-4"
            >
              <Link
                className="min-w-0 flex-1"
                href={`${basePath}/${session.slug}`}
              >
                <p className="font-semibold">{session.title}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {session.sessionDate} · {session.participantCount} attendance
                  records
                </p>
              </Link>
              {canManage && (
                <div className="flex items-center gap-1">
                  <Link
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-lg"
                    href={`${basePath}/${session.slug}`}
                    aria-label={`Edit ${session.title}`}
                  >
                    <Pencil className="size-4" />
                  </Link>
                  {session.canDelete && (
                    <DestructiveActionButton
                      label="Delete"
                      icon={Trash2}
                      onClick={() => void remove(session.id)}
                    />
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {toast && (
        <button
          type="button"
          className="text-destructive text-sm"
          onClick={() => setToast("")}
        >
          {toast}
        </button>
      )}
      <ResponsiveEditor
        open={open}
        onOpenChange={setOpen}
        title="Create session"
        description="Create a session for this group."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void save()}
              disabled={!title.trim() || !date}
            >
              Save session
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            className="min-h-11 text-base"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Session title"
          />
          <DatePicker
            id="portal-group-session-date"
            value={date}
            onChange={setDate}
            placeholder="Select session date"
          />
        </div>
      </ResponsiveEditor>
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
  const [toast, setToast] = React.useState("");
  async function setStatus(
    memberId: string,
    status: "present" | "absent" | "excused",
  ) {
    const result = await savePortalAttendanceAction({
      sessionId: session.id,
      memberId,
      status,
    });
    if (!result.success)
      return setToast(result.error ?? "Unable to save attendance.");
    setRows((current) =>
      current.map((row) => (row.id === memberId ? { ...row, status } : row)),
    );
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <Link className="text-primary text-sm font-semibold" href={backPath}>
        ← Back to group sessions
      </Link>
      <div>
        <p className="text-muted-foreground text-sm">{session.groupName}</p>
        <h1 className="text-2xl font-bold">{session.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {session.sessionDate}
        </p>
      </div>
      <div className="grid gap-3">
        {rows.map((member) => (
          <article
            key={member.id}
            className="bg-card border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
          >
            <span className="font-medium">{member.name}</span>
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                {(["present", "absent", "excused"] as const).map((status) => (
                  <Button
                    key={status}
                    variant={member.status === status ? "default" : "outline"}
                    className="min-h-11 capitalize"
                    onClick={() => void setStatus(member.id, status)}
                  >
                    {member.status === status ? (
                      <Check className="mr-1 size-4" />
                    ) : null}
                    {status}
                  </Button>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm capitalize">
                {member.status ?? "pending"}
              </span>
            )}
          </article>
        ))}
      </div>
      {toast && (
        <button
          type="button"
          className="text-destructive text-sm"
          onClick={() => setToast("")}
        >
          {toast}
        </button>
      )}
    </div>
  );
}
