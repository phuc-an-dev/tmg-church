"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { OptionPickerSheet } from "@/components/shared/option-picker-sheet";
import { MemberAssignDrawer } from "@/components/shared/member-assign-drawer";
import {
  addCareNoteAction,
  assignCareFollowUpAction,
  createCareFollowUpAction,
  loadCareGroupOptionsAction,
  updateCareFollowUpAction,
} from "../actions";
import type {
  CareActionResult,
  CareDetail,
  CareGroup,
  CareGroupOptions,
  CareScope,
  CareSuggestion,
} from "../types";

export type CareEditorMode =
  "create" | "note" | "date" | "assign" | "start" | "resolve";
const titles: Record<CareEditorMode, string> = {
  create: "Create follow-up",
  note: "Add private note",
  date: "Update contact date",
  assign: "Assign follow-up",
  start: "Start follow-up",
  resolve: "Resolve follow-up",
};

function Picker({
  label,
  value,
  options,
  onChange,
  disabled,
  memberPicker = false,
}: {
  label: string;
  value: string;
  options: { id: string; name: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  memberPicker?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Button
        id={id}
        type="button"
        variant="outline"
        className="border-input bg-card text-foreground disabled:bg-muted disabled:text-muted-foreground dark:bg-card dark:disabled:bg-muted min-h-11 w-full justify-between overflow-hidden text-base disabled:opacity-100"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setSelectedIds(value ? [value] : []);
          setOpen(true);
        }}
      >
        <span className="truncate">
          {options.find((item) => item.id === value)?.name ??
            `Select ${label.toLowerCase()}`}
        </span>
        {!disabled && <ChevronDown className="size-4" aria-hidden="true" />}
      </Button>
      {memberPicker ? (
        <MemberAssignDrawer
          open={open}
          onOpenChange={setOpen}
          title="Select member"
          searchPlaceholder="Search members..."
          members={options}
          singleSelect
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          assignLabel="Confirm"
          emptySearchMessage="No members match your search."
          emptyListMessage="No members available."
          onAssign={(ids) => {
            if (!ids[0]) return;
            onChange(ids[0]);
            setOpen(false);
          }}
        />
      ) : (
        <OptionPickerSheet
          key={value}
          open={open}
          onOpenChange={setOpen}
          title={`Select ${label.toLowerCase()}`}
          value={value}
          options={options.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          onChange={onChange}
          itemLabelClassName="text-base"
        />
      )}
    </div>
  );
}

export function CareEditor({
  mode,
  scope,
  group,
  suggestion,
  detail,
  onClose,
  onSaved,
}: {
  mode: CareEditorMode;
  scope?: CareScope;
  group?: CareGroup | null;
  suggestion?: CareSuggestion;
  detail?: CareDetail;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [groupId, setGroupId] = useState(
    suggestion?.groupId ??
      group?.id ??
      detail?.case.groupId ??
      scope?.groups[0]?.id ??
      "",
  );
  const [memberId, setMemberId] = useState(suggestion?.memberId ?? "");
  const [assigneeId, setAssigneeId] = useState(detail?.case.assigneeId ?? "");
  const [date, setDate] = useState(detail?.case.nextContactDate ?? "");
  const [note, setNote] = useState("");
  const [options, setOptions] = useState<CareGroupOptions | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const canCoordinate = scope?.canCoordinate ?? detail?.canCoordinate ?? false;

  useEffect(() => {
    if (!groupId || (mode !== "create" && mode !== "assign")) return;
    let active = true;
    loadCareGroupOptionsAction({ groupId })
      .then((result) => {
        if (!active) return;
        if (!result.success) {
          setError(result.error);
          return;
        }
        setOptions(result.data);
        setAssigneeId((current) =>
          result.data.assignees.some((item) => item.id === current)
            ? current
            : result.data.defaultAssigneeId,
        );
      })
      .catch(() => {
        if (active) {
          setError("Unable to load options. Please try again.");
        }
      });
    return () => {
      active = false;
    };
  }, [groupId, mode]);

  const loading =
    (mode === "create" || mode === "assign") && !options && !error;

  function save() {
    setError("");
    startTransition(async () => {
      let result: CareActionResult;
      try {
        result =
          mode === "create"
            ? await createCareFollowUpAction({
                groupId,
                memberId,
                assigneeId,
                nextContactDate: date || null,
                source: suggestion ? "attendance" : "manual",
              })
            : mode === "note"
              ? await addCareNoteAction({ caseId: detail!.case.id, note })
              : mode === "assign"
                ? await assignCareFollowUpAction({
                    caseId: detail!.case.id,
                    assigneeId,
                  })
                : await updateCareFollowUpAction({
                    caseId: detail!.case.id,
                    status:
                      mode === "resolve"
                        ? "resolved"
                        : mode === "start"
                          ? "in_progress"
                          : detail!.case.status,
                    nextContactDate: date || null,
                  });
      } catch {
        setError("Unable to save changes. Please try again.");
        return;
      }
      if (!result.success) {
        setError(result.error);
        return;
      }
      onClose();
      await onSaved();
    });
  }
  const disabled =
    pending ||
    loading ||
    (mode === "create" && (!options || !memberId || !assigneeId)) ||
    (mode === "assign" && (!options || !assigneeId)) ||
    (mode === "note" && !note.trim());
  return (
    <ResponsiveEditor
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      title={titles[mode]}
      description={
        suggestion
          ? "Confirm the attendance suggestion and choose the next contact date."
          : detail?.case.memberName
      }
      footer={
        <>
          <Button
            variant="outline"
            className="min-h-11 text-base"
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="min-h-11 text-base"
            disabled={disabled}
            onClick={save}
          >
            {pending
              ? "Saving..."
              : mode === "resolve"
                ? "Resolve"
                : mode === "start"
                  ? "Start follow-up"
                  : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-5 py-2">
        {mode === "create" && (
          <>
            {!suggestion && scope && (
              <Picker
                label="Group"
                value={groupId}
                options={scope.groups}
                disabled={pending || !canCoordinate || !!group}
                onChange={(id) => {
                  setGroupId(id);
                  setOptions(null);
                  setMemberId("");
                  setAssigneeId("");
                  setError("");
                }}
              />
            )}
            {suggestion ? (
              <div className="space-y-2">
                <p className="font-semibold">{suggestion.memberName}</p>
                <p className="text-muted-foreground text-sm">
                  {suggestion.groupName}
                </p>
                <p className="text-sm">
                  Absent at three consecutive group sessions:
                </p>
                <ul className="list-inside list-disc text-sm">
                  {suggestion.sourceEvidence.sessions.map((session) => (
                    <li key={session.id}>{session.date}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <Picker
                label="Member"
                memberPicker
                value={memberId}
                options={options?.members ?? []}
                onChange={setMemberId}
                disabled={pending || loading || !options}
              />
            )}
          </>
        )}
        {(mode === "create" || mode === "assign") &&
          (canCoordinate ? (
            <Picker
              label="Assignee"
              value={assigneeId}
              options={options?.assignees ?? []}
              onChange={setAssigneeId}
              disabled={pending || loading || !options}
            />
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Assignee</p>
              <p className="text-base">
                {options?.assignees.find((item) => item.id === assigneeId)
                  ?.name ?? "Loading your assignment..."}
              </p>
              <p className="text-muted-foreground text-sm">
                You will be responsible for this follow-up.
              </p>
            </div>
          ))}
        {(mode === "create" || mode === "date") && (
          <div className="space-y-2">
            <Label htmlFor="care-contact-date">
              Next contact date (optional)
            </Label>
            <DatePicker
              id="care-contact-date"
              value={date}
              onChange={setDate}
              disabled={pending}
              className="min-h-11 w-full text-base [&>button]:min-h-11 [&>button]:min-w-11"
              aria-label="Next contact date"
            />
          </div>
        )}
        {mode === "note" && (
          <div className="space-y-2">
            <Label htmlFor="care-note">Private note</Label>
            <textarea
              id="care-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={4000}
              rows={6}
              disabled={pending}
              className="border-input bg-background focus:ring-ring w-full rounded-xl border p-3 text-base focus:ring-2 focus:outline-none"
              placeholder="Record your contact and the next steps."
            />
            <p className="text-muted-foreground text-sm">
              Only the assigned caregiver and this term&apos;s Care commissioner
              can read notes. Notes cannot be edited or deleted.
            </p>
          </div>
        )}
        {mode === "start" && (
          <p className="text-sm">Mark this follow-up as in progress.</p>
        )}
        {mode === "resolve" && (
          <p className="text-sm">
            Mark this follow-up as resolved. The record and private notes will
            remain in History. This action cannot be undone.
          </p>
        )}
        {loading && (
          <p role="status" className="text-muted-foreground text-sm">
            Loading options...
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>
    </ResponsiveEditor>
  );
}
