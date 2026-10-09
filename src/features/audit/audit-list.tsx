"use client";

import { useState, useTransition } from "react";
import { useQueryStates } from "nuqs";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  History,
  Users,
  Layers3,
  CalendarDays,
  ShieldCheck,
  HeartHandshake,
  Tags,
  Church,
  Sparkles,
  ClipboardCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { OptionPickerSheet } from "@/components/shared/option-picker-sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationCard } from "@/components/shared/pagination-card";
import {
  auditSearchParams,
  AUDIT_MODULES,
  DEFAULT_AUDIT_FILTERS,
  auditFilterSchema,
  type AuditFilters,
} from "./search-params";
import type { AuditEntry, AuditOption, AuditPageData } from "./types";
import { AuditRowsSkeleton } from "./audit-skeleton";
import type { Json } from "@/types/database";

function auditLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll(".", " · ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
const moduleLabels: Record<string, string> = {
  members: "Members",
  ministries: "Ministries",
  sessions: "Sessions",
  attendance: "Attendance",
  access: "Access & roles",
  care: "Care",
  segments: "Segments",
  church: "Church",
  icons: "Icons",
};
const moduleIcons = {
  members: Users,
  ministries: Layers3,
  sessions: CalendarDays,
  attendance: ClipboardCheck,
  access: ShieldCheck,
  care: HeartHandshake,
  segments: Tags,
  church: Church,
  icons: Sparkles,
};
const objectLabels: Record<string, string> = {
  member_profile: "Member",
  member_access_request: "Access request",
  member_access_invitation: "Invitation",
  system_role_assignment: "System role",
  term_role_assignment: "Term role",
  care_flag: "Follow-up",
  care_note: "Care note",
};
function actionLabel(action: string) {
  const known: Record<string, string> = {
    "authorization.access_request.approved": "Access approved",
    "authorization.access_request.rejected": "Access declined",
    "authorization.access_request.pending": "Access requested",
    "authorization.invitation.created": "Invitation created",
    "authorization.invitation.resent": "Invitation resent",
    "authorization.invitation.consumed": "Invitation accepted",
    "authorization.invitation.revoked": "Invitation revoked",
    "system_role.assigned": "System role assigned",
    "system_role.updated": "System role changed",
    "system_role.removed": "System role removed",
    "term_role.assigned": "Term role assigned",
    "term_role.updated": "Term role changed",
    "term_role.removed": "Term role removed",
    "ministry_term.lifecycle_transition": "Term status changed",
    "care.created": "Follow-up created",
    "care.updated": "Follow-up updated",
    "care.assigned": "Follow-up assigned",
    "care.resolved": "Follow-up resolved",
    "care.note_added": "Care note added",
    "care.removed": "Follow-up removed",
  };
  if (known[action]) return known[action];
  const parts = action.split(".");
  const operation = parts.length > 1 ? parts.pop() : undefined;
  const subject = parts.join("_").replace(/^authorization_/, "");
  return `${objectLabels[subject] ?? auditLabel(subject)} ${operation ? operation.replaceAll("_", " ") : "activity"}`;
}
const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh",
  dateStyle: "medium",
});
const clockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
function targetLabel(entry: AuditEntry) {
  return entry.target_name === entry.target_type?.replaceAll("_", " ")
    ? (objectLabels[entry.target_type ?? ""] ??
        auditLabel(entry.target_name ?? "Unknown object"))
    : entry.target_name;
}
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh",
  dateStyle: "medium",
  timeStyle: "medium",
});
function timestamp(value: string | null) {
  return value ? timeFormatter.format(new Date(value)) : "Unknown time";
}
function object(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}
function display(
  value: Json | undefined,
  references: Record<string, Json | undefined>,
) {
  if (value === null || value === undefined) return "Not set";
  if (typeof value === "string")
    return typeof references[value] === "string"
      ? String(references[value])
      : value;
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function AuditList({
  data,
  filters,
  invalidFilters,
}: {
  data: AuditPageData;
  filters: AuditFilters;
  invalidFilters: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [, setQuery] = useQueryStates(auditSearchParams, {
    shallow: false,
    startTransition,
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const [filterError, setFilterError] = useState("");
  const [picker, setPicker] = useState<
    "module" | "actor" | "action" | "ministry" | "group" | null
  >(null);
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const options: Record<NonNullable<typeof picker>, AuditOption[]> = {
    module: AUDIT_MODULES.map((value) => ({
      value,
      label: moduleLabels[value],
    })),
    actor: [{ value: "system", label: "System" }, ...data.options.actors],
    action: data.options.actions.map((item) => ({
      ...item,
      label: actionLabel(item.label),
    })),
    ministry: data.options.ministries,
    group: data.options.groups,
  };
  const labels = {
    module: "Module",
    actor: "Performed by",
    action: "Action",
    ministry: "Ministry",
    group: "Group",
  };
  const activeCount = Object.entries(filters).filter(
    ([key, value]) => key !== "page" && Boolean(value),
  ).length;
  function openFilters() {
    setDraft(filters);
    setFilterError("");
    setFilterOpen(true);
  }
  function applyFilters() {
    const parsed = auditFilterSchema.safeParse({ ...draft, page: 1 });
    if (!parsed.success) {
      setFilterError(parsed.error.issues[0]?.message ?? "Invalid filters.");
      return;
    }
    void setQuery(parsed.data);
    setFilterOpen(false);
  }
  const payload = selected ? object(selected.payload) : {};
  const before = { ...object(payload.before) };
  const after = { ...object(payload.after) };
  const hasSnapshots =
    Object.hasOwn(payload, "before") || Object.hasOwn(payload, "after");
  if (!hasSnapshots) {
    for (const [key, value] of Object.entries(payload)) {
      if (!key.startsWith("old_")) continue;
      const field = key.slice(4);
      if (!Object.hasOwn(payload, `new_${field}`)) continue;
      before[field] = value;
      after[field] = payload[`new_${field}`];
    }
  }
  const references = object(payload.references);
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  function fieldLabel(field: string) {
    const names: Record<string, string> = {
      lifecycle: "Status",
      full_name: "Name",
      assignee_member_profile_id: "Assignee",
      member_profile_id: "Member",
      ministry_membership_id: "Member",
      term_group_id: "Group",
      term_department_id: "Department",
      ministry_term_id: "Term",
      resolved_by_member_profile_id: "Resolved by",
      created_by_member_profile_id: "Created by",
      author_member_profile_id: "Author",
    };
    return names[field] ?? auditLabel(field.replace(/_id$/, ""));
  }
  function changeValue(field: string, value: Json | undefined) {
    if (typeof value === "string") {
      if (
        [
          "status",
          "lifecycle",
          "gender",
          "role",
          "source",
          "flag_type",
        ].includes(field)
      )
        return auditLabel(value);
      if (field.endsWith("_id") && !references[value])
        return "Reference unavailable";
      if (field === "date_of_birth" && /^\d{4}-\d{2}-\d{2}$/.test(value))
        return value.split("-").reverse().join("/");
    }
    return display(value, references);
  }
  const grouped = new Map<string, AuditEntry[]>();
  for (const entry of data.entries) {
    const day = entry.created_at
      ? dayFormatter.format(new Date(entry.created_at))
      : "Unknown date";
    const rows = grouped.get(day) ?? [];
    rows.push(entry);
    grouped.set(day, rows);
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {data.count} {data.count === 1 ? "event" : "events"}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Vietnam time · UTC+7
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {activeCount > 0 && (
            <Button
              variant="outline"
              className="min-h-11 text-base"
              disabled={pending}
              onClick={() => void setQuery(DEFAULT_AUDIT_FILTERS)}
            >
              Clear
            </Button>
          )}
          <Button
            variant="outline"
            className="min-h-11 text-base"
            disabled={pending}
            onClick={openFilters}
          >
            <Filter className="size-4" aria-hidden="true" />
            Filters{activeCount ? ` (${activeCount})` : ""}
          </Button>
        </div>
      </div>
      {invalidFilters && (
        <p role="alert" className="text-destructive text-sm">
          Invalid URL filters were ignored.{" "}
          <Button
            variant="link"
            className="min-h-11"
            onClick={() => void setQuery(DEFAULT_AUDIT_FILTERS)}
          >
            Clear URL filters
          </Button>
        </p>
      )}
      {activeCount > 0 && (
        <div
          aria-label="Applied filters"
          className="flex flex-wrap gap-2 text-sm"
        >
          {(Object.keys(labels) as NonNullable<typeof picker>[])
            .filter((key) => filters[key])
            .map((key) => (
              <span
                key={key}
                className="bg-muted rounded-lg px-3 py-2 break-words"
              >
                {labels[key]}:{" "}
                {options[key].find((item) => item.value === filters[key])
                  ?.label ?? filters[key]}
              </span>
            ))}
          {(filters.from || filters.to) && (
            <span className="bg-muted rounded-lg px-3 py-2">
              {filters.from || "Beginning"} to {filters.to || "Today"}
            </span>
          )}
        </div>
      )}
      {pending ? (
        <AuditRowsSkeleton />
      ) : !data.entries.length ? (
        <EmptyState
          icon={History}
          title="No audit events"
          description={
            activeCount
              ? "Try a different date range or clear the filters."
              : "Recorded activity will appear here. Earlier changes may not have been logged."
          }
        />
      ) : (
        <div className="space-y-5">
          {[...grouped].map(([day, entries]) => (
            <section
              key={day}
              aria-label={`Activity on ${day}`}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 px-1">
                <h2 className="text-muted-foreground text-xs font-semibold tracking-wide">
                  {day}
                </h2>
                <span
                  aria-label={`${entries.length} events on this page`}
                  className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-xs tabular-nums"
                >
                  {entries.length}
                </span>
              </div>
              {entries.map((entry) => {
                const Icon =
                  moduleIcons[entry.module as keyof typeof moduleIcons] ??
                  History;
                const action = entry.action ?? "Unknown action";
                return (
                  <button
                    type="button"
                    key={entry.id}
                    onClick={() => setSelected(entry)}
                    className="admin-item-card hover:border-primary/40 focus-visible:ring-primary flex min-h-14 w-full items-center gap-3 p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none sm:p-5"
                  >
                    <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base leading-snug font-semibold break-words">
                        {actionLabel(action)}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs leading-5 break-words">
                        {targetLabel(entry)}
                      </p>
                      {entry.scope_type !== "church" && (
                        <p className="text-muted-foreground mt-0.5 text-xs leading-5 break-words">
                          {[entry.ministry_name, entry.scope_name]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-5">
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <UserRound
                            className="size-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="break-words">
                            <span className="sr-only">Performed by </span>
                            {entry.actor_name}
                          </span>
                        </span>
                        {entry.created_at && (
                          <time
                            dateTime={entry.created_at}
                            className="shrink-0 tabular-nums"
                          >
                            ·{" "}
                            {clockFormatter.format(new Date(entry.created_at))}
                          </time>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      className="text-muted-foreground size-4 shrink-0"
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      )}

      {!pending && (
        <PaginationCard
          page={data.page}
          count={data.count}
          onPageChange={(page) => void setQuery({ page })}
        />
      )}
      <ResponsiveEditor
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title="Filter audit history"
        description="Filter recorded activity. Dates use Vietnam time (UTC+7)."
        footer={
          <>
            <Button variant="outline" onClick={() => setFilterOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyFilters}>Apply filters</Button>
          </>
        }
      >
        <div className="space-y-4">
          {(Object.keys(labels) as NonNullable<typeof picker>[]).map((key) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`audit-${key}`}>{labels[key]}</Label>
              <Button
                id={`audit-${key}`}
                variant="outline"
                className="bg-card min-h-12 w-full justify-between text-base"
                onClick={() => setPicker(key)}
              >
                <span className="truncate">
                  {options[key].find((item) => item.value === draft[key])
                    ?.label ??
                    (draft[key] ||
                      `All ${key === "actor" ? "people" : key === "ministry" ? "ministries" : `${key}s`}`)}
                </span>
                <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
              </Button>
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="audit-from">From date</Label>
            <DatePicker
              id="audit-from"
              value={draft.from}
              max={draft.to || undefined}
              onChange={(from) => setDraft({ ...draft, from })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-to">To date</Label>
            <DatePicker
              id="audit-to"
              value={draft.to}
              min={draft.from || undefined}
              onChange={(to) => setDraft({ ...draft, to })}
            />
          </div>
          {filterError && (
            <p role="alert" className="text-destructive text-sm">
              {filterError}
            </p>
          )}
          <Button
            variant="outline"
            className="min-h-11 w-full text-base"
            onClick={() => {
              setDraft(DEFAULT_AUDIT_FILTERS);
              setFilterError("");
            }}
          >
            Clear filters
          </Button>
        </div>
      </ResponsiveEditor>
      {picker && (
        <OptionPickerSheet
          open
          onOpenChange={(open) => {
            if (!open) setPicker(null);
          }}
          title={labels[picker]}
          options={[{ value: "", label: "All" }, ...options[picker]]}
          value={draft[picker]}
          itemLabelClassName="text-base"
          onChange={(value) => setDraft({ ...draft, [picker]: value })}
        />
      )}
      <ResponsiveEditor
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={
          selected
            ? actionLabel(selected.action ?? "Unknown action")
            : "Audit event"
        }
        description="Read-only history. Events cannot be edited or deleted."
        maxWidthClass="sm:max-w-2xl"
        footer={
          <Button
            variant="outline"
            className="col-span-2"
            onClick={() => setSelected(null)}
          >
            Done
          </Button>
        }
      >
        {selected && (
          <div className="space-y-5">
            <dl className="divide-border divide-y border-b">
              {[
                ["Object", targetLabel(selected)],
                ["Module", moduleLabels[selected.module ?? ""] ?? "Activity"],
                ["Performed by", selected.actor_name],
                ["Time (UTC+7)", timestamp(selected.created_at)],
                [
                  "Scope",
                  [selected.ministry_name, selected.scope_name]
                    .filter(Boolean)
                    .join(" · "),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-1 gap-1.5 py-4 min-[360px]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] min-[360px]:gap-4"
                >
                  <dt className="text-muted-foreground text-sm leading-6">
                    {label}
                  </dt>
                  <dd className="min-w-0 text-base leading-6 break-words min-[360px]:text-right">
                    {value || "Not available"}
                  </dd>
                </div>
              ))}
            </dl>
            <section aria-label="Recorded changes" className="space-y-2">
              <h3 className="text-base font-semibold">Recorded changes</h3>
              {(!payload.actor_name || !payload.target_name) && (
                <p className="text-muted-foreground text-xs leading-5">
                  Earlier event: names may reflect current records.
                </p>
              )}
              {!fields.length ? (
                <p className="text-muted-foreground py-3 text-sm">
                  Field-level changes were not recorded for this event.
                </p>
              ) : (
                <dl className="divide-border divide-y border-b">
                  {fields.map((field) => (
                    <div
                      key={field}
                      className="grid grid-cols-1 gap-2 py-4 min-[360px]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] min-[360px]:gap-4"
                    >
                      <dt className="text-muted-foreground text-sm leading-6">
                        {fieldLabel(field)}
                      </dt>
                      <dd className="min-w-0 space-y-2 min-[360px]:text-right">
                        <div>
                          <p className="text-muted-foreground text-xs">After</p>
                          <p className="mt-1 text-base leading-6 font-medium break-words whitespace-pre-wrap">
                            {changeValue(field, after[field])}
                          </p>
                        </div>
                        <div className="text-muted-foreground">
                          <p className="text-xs">Before</p>
                          <p className="mt-1 text-sm leading-6 break-words whitespace-pre-wrap">
                            {changeValue(field, before[field])}
                          </p>
                        </div>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
            <details className="rounded-xl border px-3">
              <summary className="text-muted-foreground min-h-11 cursor-pointer py-3 text-sm font-medium">
                Technical details
              </summary>
              <dl className="space-y-3 pb-3">
                {[
                  ["Action code", selected.action],
                  ["Object type", selected.target_type],
                  ["Object ID", selected.target_id],
                  ["Actor ID", selected.actor_id ?? "System"],
                  ["Event ID", selected.id],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground text-xs">{label}</dt>
                    <dd className="mt-1 font-mono text-xs leading-5 break-all">
                      {value || "Not available"}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="border-t py-3">
                <p className="text-muted-foreground mb-2 text-xs">
                  Recorded metadata
                </p>
                <pre className="font-mono text-xs leading-5 break-all whitespace-pre-wrap">
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}
      </ResponsiveEditor>
    </div>
  );
}
