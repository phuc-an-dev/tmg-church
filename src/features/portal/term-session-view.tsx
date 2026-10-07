"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Calendar, CalendarSessionDayButton } from "@/components/ui/calendar";
import { FloatingCreateButton } from "@/components/shared/floating-create-button";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import {
  ExpandableActionItem,
  ExpandableCoordinatorProvider,
} from "@/components/shared/expandable-action-item";
import { ListTable, ListTableBody } from "@/components/shared/list-table";
import { StatusToast } from "@/components/ui/status-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  savePortalTermSessionAction,
  deletePortalTermSessionAction,
} from "./term-session-actions";

type Session = {
  id: string;
  slug: string;
  title: string;
  sessionDate: string;
  participantCount: number;
  roster: { roleId: string; roleName: string; memberNames: string[] }[];
};

export function PortalTermSessionView({
  ministryTermId,
  ministrySlug,
  termSlug,
  fromDepartment,
  sessions,
  initialDate,
  initialCreate = false,
}: {
  ministryTermId: string;
  ministrySlug: string;
  termSlug: string;
  fromDepartment?: string;
  sessions: Session[];
  initialDate?: string;
  initialCreate?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Session | "new" | null>(
    initialCreate ? "new" : null,
  );
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState(
    initialCreate ? (initialDate ?? "") : "",
  );
  const [pending, setPending] = React.useState(false);
  const [toast, setToast] = React.useState("");
  const today = format(new Date(), "yyyy-MM-dd");
  const [activeDate, setActiveDate] = React.useState(initialDate ?? today);
  const [month, setMonth] = React.useState(
    parseISO(`${(initialDate ?? today).slice(0, 7)}-01`),
  );
  const byDate = React.useMemo(
    () =>
      sessions.reduce<Record<string, Session[]>>(
        (a, s) => ((a[s.sessionDate] ??= []).push(s), a),
        {},
      ),
    [sessions],
  );
  const open = (session: Session | "new") => {
    setEditing(session);
    setTitle(session === "new" ? "" : session.title);
    setDate(session === "new" ? activeDate : session.sessionDate);
  };
  async function save() {
    if (!editing) return;
    setPending(true);
    const result = await savePortalTermSessionAction({
      sessionId: editing === "new" ? null : editing.id,
      ministryTermId,
      title,
      sessionDate: date,
    });
    setPending(false);
    if (!result.success)
      return setToast(result.error ?? "Unable to save session.");
    setEditing(null);
    setActiveDate(date);
    router.refresh();
  }
  async function remove(sessionId: string) {
    setPending(true);
    const result = await deletePortalTermSessionAction({ sessionId });
    setPending(false);
    if (!result.success)
      return setToast(result.error ?? "Unable to delete session.");
    router.refresh();
  }
  return (
    <div className="space-y-6 pb-32">
      <Calendar
        mode="single"
        month={month}
        selected={parseISO(activeDate)}
        onMonthChange={setMonth}
        onDayClick={(day) => setActiveDate(format(day, "yyyy-MM-dd"))}
        components={{
          DayButton: (props) => (
            <CalendarSessionDayButton
              {...props}
              count={
                (byDate[format(props.day.date, "yyyy-MM-dd")] ?? []).length
              }
            />
          ),
        }}
      />
      <section aria-live="polite" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-base font-semibold">
            Sessions on {format(parseISO(activeDate), "MMM d, yyyy")}
          </h2>
          <p className="text-muted-foreground shrink-0 text-xs">
            {(byDate[activeDate] ?? []).length}{" "}
            {(byDate[activeDate] ?? []).length === 1 ? "session" : "sessions"}
          </p>
        </div>
        {(byDate[activeDate] ?? []).length ? (
          <ExpandableCoordinatorProvider resetKey={activeDate}>
            <ListTable label="Ministry sessions">
              <ListTableBody>
                {(byDate[activeDate] ?? []).map((session) => (
                  <ExpandableActionItem
                    key={session.id}
                    id={`ministry-session-${session.id}`}
                    name={session.title}
                    onEdit={() => open(session)}
                    editLabel="Edit session"
                    onDelete={() => void remove(session.id)}
                    deleteLabel="Delete session"
                    deleteIcon={Trash2}
                    deleteDisabled={pending}
                    className="p-4 md:border-b md:last:border-b-0"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <Link
                        href={`/portal/ministries/${ministrySlug}/terms/${termSlug}/sessions/${session.slug}${fromDepartment ? `?fromDepartment=${encodeURIComponent(fromDepartment)}` : ""}`}
                        className="group/item flex min-w-0 flex-1 items-center gap-3"
                      >
                        <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                          <CalendarDays className="size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 text-base font-medium group-hover/item:underline">
                          {session.title}
                        </span>
                      </Link>
                      <ExpandableActionItem.Trigger className="ml-auto md:hidden" />
                      <div className="hidden shrink-0 md:block">
                        <ExpandableActionItem.DesktopActions />
                      </div>
                    </div>
                    {session.roster.length > 0 ? (
                      <table className="border-border/70 mt-3 w-full table-fixed border-collapse border-t text-left">
                        <caption className="sr-only">
                          Service roster for {session.title}
                        </caption>
                        <colgroup>
                          <col className="w-[35%]" />
                          <col className="w-[65%]" />
                        </colgroup>
                        <thead>
                          <tr className="border-border/70 border-b">
                            <th
                              scope="col"
                              className="text-muted-foreground py-2 pr-3 text-xs font-medium"
                            >
                              Role
                            </th>
                            <th
                              scope="col"
                              className="text-muted-foreground py-2 text-xs font-medium"
                            >
                              Members
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {session.roster.map((role) => (
                            <tr
                              key={role.roleId}
                              className="border-border/70 border-b last:border-b-0"
                            >
                              <th
                                scope="row"
                                className="text-foreground py-3 pr-3 align-top text-sm font-semibold break-words"
                              >
                                {role.roleName}
                              </th>
                              <td className="text-muted-foreground py-3 align-top text-sm font-normal break-words">
                                <div className="space-y-1">
                                  {role.memberNames.length
                                    ? role.memberNames.map((name) => (
                                        <span key={name} className="block">
                                          {name}
                                        </span>
                                      ))
                                    : "Unassigned"}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-muted-foreground mt-3 text-sm">
                        No assignments yet
                      </p>
                    )}
                    <ExpandableActionItem.MobileActions />
                  </ExpandableActionItem>
                ))}
              </ListTableBody>
            </ListTable>
          </ExpandableCoordinatorProvider>
        ) : (
          <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
            No sessions on this day.
          </p>
        )}
      </section>
      <FloatingCreateButton onClick={() => open("new")}>
        New session
      </FloatingCreateButton>
      <ResponsiveEditor
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing === "new" ? "Create session" : "Edit session"}
        description="Ministry session"
        footer={
          <>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => setEditing(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              className="min-h-11"
              onClick={() => void save()}
              disabled={pending || !title.trim() || !date}
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
            id="portal-ministry-session-date"
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
