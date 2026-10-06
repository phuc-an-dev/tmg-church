"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CalendarDays, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Calendar, CalendarSessionDayButton } from "@/components/ui/calendar";
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
  deletePortalDepartmentSessionAction,
  savePortalDepartmentSessionAction,
} from "./department-session-actions";
import type { PortalDepartmentSessionRow } from "./department-session-queries";

export function PortalDepartmentSessionView({
  department,
  sessions,
  canManage,
  canManageMinistry,
  basePath,
}: {
  department: {
    id: string;
    name: string;
    slug: string;
    ministryTermId: string;
    ministrySlug: string;
    termSlug: string;
  };
  sessions: PortalDepartmentSessionRow[];
  canManage: boolean;
  canManageMinistry: boolean;
  basePath: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<
    PortalDepartmentSessionRow | "new" | null
  >(null);
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState("");
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState("");

  const today = format(new Date(), "yyyy-MM-dd");
  const sessionsByDate = React.useMemo(
    () =>
      sessions.reduce<Record<string, PortalDepartmentSessionRow[]>>(
        (acc, session) => {
          acc[session.sessionDate] = [
            ...(acc[session.sessionDate] ?? []),
            session,
          ];
          return acc;
        },
        {},
      ),
    [sessions],
  );
  const initialDate =
    sessions.find((session) => session.sessionDate >= today)?.sessionDate ??
    sessions[0]?.sessionDate ??
    today;
  const [activeDate, setActiveDate] = React.useState(initialDate);
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(
    parseISO(`${initialDate.slice(0, 7)}-01`),
  );

  const daySessions = sessionsByDate[activeDate] ?? [];

  function openEditor(
    session: PortalDepartmentSessionRow | "new",
    dateOverride?: string,
  ) {
    setEditing(session);
    setTitle(session === "new" ? "" : session.title);
    setDate(
      session === "new" ? (dateOverride ?? activeDate) : session.sessionDate,
    );
  }

  async function save() {
    if (!editing) return;
    setPendingId("save");
    const result = await savePortalDepartmentSessionAction({
      sessionId: editing === "new" ? null : editing.id,
      ministryTermId: department.ministryTermId,
      departmentId: department.id,
      title,
      sessionDate: date,
    });
    setPendingId(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to save session.");
    setEditing(null);
    setActiveDate(date);
    router.refresh();
  }
  async function remove(id: string) {
    setPendingId(id);
    const result = await deletePortalDepartmentSessionAction({
      sessionId: id,
    });
    setPendingId(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to delete session.");
    router.refresh();
  }

  return (
    <div className="space-y-6 pb-32">
      {canManageMinistry && (
        <Button
          asChild
          variant="outline"
          className="min-h-14 w-full justify-between px-4 text-left"
        >
          <Link
            href={`/portal/ministries/${department.ministrySlug}/terms/${department.termSlug}?fromDepartment=${department.slug}`}
          >
            <span className="min-w-0">
              <span className="block font-medium">
                Manage ministry sessions
              </span>
              <span className="text-muted-foreground block text-xs">
                For the whole ministry
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
        </Button>
      )}
      <Calendar
        mode="single"
        month={calendarMonth}
        selected={parseISO(activeDate)}
        onMonthChange={setCalendarMonth}
        onDayClick={(day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          setActiveDate(dateStr);
        }}
        components={{
          DayButton: (props) => (
            <CalendarSessionDayButton
              {...props}
              count={
                (sessionsByDate[format(props.day.date, "yyyy-MM-dd")] ?? [])
                  .length
              }
            />
          ),
        }}
      />

      <section aria-live="polite" className="space-y-3">
        <div className="px-1">
          <h2 className="text-base font-semibold">
            Sessions on {format(parseISO(activeDate), "MMM d, yyyy")}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {daySessions.length}{" "}
            {daySessions.length === 1 ? "session" : "sessions"}
          </p>
        </div>

        {daySessions.length === 0 ? (
          <div className="border-border/60 bg-muted/20 rounded-xl border border-dashed p-6 text-center">
            <p className="text-muted-foreground text-sm">
              {canManage
                ? "No sessions on this day. Use the New session button to add one."
                : "No sessions on this day."}
            </p>
          </div>
        ) : (
          <ExpandableCoordinatorProvider resetKey={activeDate}>
            <ListTablePlaceholder
              sessions={daySessions}
              basePath={basePath}
              canManage={canManage}
              onEdit={openEditor}
              remove={remove}
              pendingId={pendingId}
            />
          </ExpandableCoordinatorProvider>
        )}
      </section>

      {canManage && (
        <FloatingCreateButton onClick={() => openEditor("new")}>
          New session
        </FloatingCreateButton>
      )}

      <ResponsiveEditor
        open={Boolean(editing)}
        onOpenChange={(nextOpen) => !nextOpen && setEditing(null)}
        title={editing === "new" ? "Create session" : "Edit session"}
        description="Department session"
        footer={
          <>
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => setEditing(null)}
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
            id="portal-department-session-date"
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

function ListTablePlaceholder({
  sessions,
  basePath,
  canManage,
  onEdit,
  remove,
  pendingId,
}: {
  sessions: PortalDepartmentSessionRow[];
  basePath: string;
  canManage: boolean;
  onEdit: (session: PortalDepartmentSessionRow) => void;
  remove: (id: string) => Promise<void>;
  pendingId: string | null;
}) {
  return (
    <ListTable label="Department sessions">
      <ListTableBody>
        {sessions.map((session) => (
          <ExpandableActionItem
            key={session.id}
            id={`department-session-${session.id}`}
            name={session.title}
            onEdit={canManage ? () => onEdit(session) : undefined}
            editLabel="Edit session"
            onDelete={canManage ? () => void remove(session.id) : undefined}
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
  );
}
