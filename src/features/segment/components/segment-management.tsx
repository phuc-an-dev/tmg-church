"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  ExpandableActionItem,
  ExpandableCoordinatorProvider,
} from "@/components/shared/expandable-action-item";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import {
  IdentityPicker,
  IdentityTile,
} from "@/features/ministry/components/ministry-management";
import {
  DEFAULT_MINISTRY_COLOR,
  DEFAULT_MINISTRY_ICON_KEY,
  normalizeMinistryColor,
} from "@/features/ministry/visual-identity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusToast } from "@/components/ui/status-toast";
import {
  deleteSegmentAction,
  previewSegmentMembersByConditionsAction,
  saveSegmentAction,
  saveSegmentConditionsAction,
} from "../actions";
import type { SegmentCondition, SegmentDetail, SegmentItem } from "../types";

const CONDITION_FIELDS: Array<{
  value: SegmentCondition["field"];
  label: string;
  placeholder: string;
}> = [
  { value: "gender", label: "Gender", placeholder: "Choose a gender" },
  {
    value: "birth_year",
    label: "Birth year",
    placeholder: "For example, 2003",
  },
  {
    value: "full_name",
    label: "Full name",
    placeholder: "For example, Nguyễn",
  },
  { value: "phone", label: "Phone", placeholder: "For example, 090" },
];

const OPERATORS_BY_FIELD: Record<
  SegmentCondition["field"],
  Array<{ value: SegmentCondition["operator"]; label: string }>
> = {
  gender: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
  ],
  birth_year: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "greater_than", label: "Greater than" },
    { value: "greater_than_or_equal", label: "Greater than or equal" },
    { value: "less_than", label: "Less than" },
    { value: "less_than_or_equal", label: "Less than or equal" },
  ],
  full_name: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "starts_with", label: "Starts with" },
    { value: "ends_with", label: "Ends with" },
    { value: "contains", label: "Contains" },
  ],
  phone: [
    { value: "equals", label: "Equals" },
    { value: "not_equals", label: "Does not equal" },
    { value: "starts_with", label: "Starts with" },
    { value: "ends_with", label: "Ends with" },
    { value: "contains", label: "Contains" },
  ],
};

function ConditionDropdown<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const activeLabel = options.find((option) => option.value === value)?.label;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`${label}: ${activeLabel}`}
          className={`bg-card hover:bg-card h-12 min-w-0 justify-between gap-2 px-3 text-sm font-normal ${className ?? ""}`}
        >
          <span className="truncate">{activeLabel}</span>
          <ChevronDown
            className="size-4 shrink-0 opacity-60"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-[70] max-h-72 min-w-44 p-1.5">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as T)}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="min-h-11 px-3 text-sm"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SegmentDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: SegmentItem;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(item?.name ?? "");
  const [accentColor, setAccentColor] = React.useState(
    item?.accentColor ?? DEFAULT_MINISTRY_COLOR,
  );
  const [iconKey, setIconKey] = React.useState(
    item?.iconKey ?? DEFAULT_MINISTRY_ICON_KEY,
  );
  const [customColorOpen, setCustomColorOpen] = React.useState(false);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  return (
    <ResponsiveEditor
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "Edit segment" : "Add segment"}
      description="Use a clear name to group members. Its URL is generated automatically."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="segment-editor" disabled={pending}>
            {pending ? "Saving..." : "Save segment"}
          </Button>
        </>
      }
    >
      <form
        id="segment-editor"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await saveSegmentAction({
              id: item?.id,
              name,
              accentColor,
              iconKey,
            });
            if (!result.success) {
              setNameError(result.fieldErrors?.name?.[0] ?? null);
              setFormError(result.fieldErrors?.name ? null : result.error);
              return;
            }
            onOpenChange(false);
            router.refresh();
            if (!item && result.data)
              router.push(`/admin/segments/${result.data.slug}`);
          });
        }}
        className="space-y-5"
      >
        {formError && (
          <p className="text-destructive text-sm" role="alert">
            {formError}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="segment-name">Name</Label>
          <Input
            id="segment-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameError(null);
              setFormError(null);
            }}
            autoFocus
            aria-invalid={Boolean(nameError)}
          />
          {nameError && (
            <p className="text-destructive text-sm" role="alert">
              {nameError}
            </p>
          )}
        </div>
        <IdentityPicker
          entityLabel="Segment"
          accentColor={accentColor}
          iconKey={iconKey}
          customColorOpen={customColorOpen}
          colorError={
            /^#[0-9a-f]{6}$/.test(accentColor.trim().toLowerCase())
              ? null
              : "Use a six-digit hex color."
          }
          previewName={name || "New Segment"}
          onAccentColorChange={(value) => {
            setAccentColor(value);
            setFormError(null);
          }}
          onIconKeyChange={(value) => {
            setIconKey(value);
            setFormError(null);
          }}
          onCustomColorOpenChange={setCustomColorOpen}
        />
      </form>
    </ResponsiveEditor>
  );
}
export function SegmentManagement({ segments }: { segments: SegmentItem[] }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [dialog, setDialog] = React.useState(false);
  const [editing, setEditing] = React.useState<SegmentItem>();
  const [deleting, setDeleting] = React.useState<SegmentItem>();
  const [toast, setToast] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const visible = segments.filter((segment) =>
    segment.name.toLocaleLowerCase().includes(q.toLocaleLowerCase()),
  );
  return (
    <ExpandableCoordinatorProvider
      resetKey={`${q}-${Boolean(dialog)}-${Boolean(deleting)}`}
    >
      <section
        className="space-y-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0"
        aria-label="Segments"
      >
        {toast && (
          <StatusToast message={toast} onDismiss={() => setToast(null)} />
        )}
        <div className="flex items-center gap-2 border-b pb-5">
          <div className="relative flex-1">
            <Search
              className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              className="bg-card h-12 pl-9"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search segments"
              aria-label="Search segments"
            />
          </div>
        </div>
        {visible.length === 0 ? (
          <div className="admin-surface rounded-2xl py-12 text-center">
            <p className="font-medium">
              {q ? "No segments match this search." : "No segments yet."}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Create a segment to organize members.
            </p>
          </div>
        ) : (
          <div
            role="table"
            aria-label="Segments"
            className="w-full text-left md:overflow-hidden md:rounded-xl md:border"
          >
            <div role="rowgroup">
              <div
                role="row"
                className="bg-muted/50 text-muted-foreground hidden text-xs font-medium md:grid md:grid-cols-[1fr_180px_120px_180px] md:items-center md:border-b md:px-4 md:py-3"
              >
                <div role="columnheader">Name</div>
                <div role="columnheader">Slug</div>
                <div role="columnheader">Members</div>
                <div role="columnheader" className="text-right">
                  Actions
                </div>
              </div>
            </div>
            <div
              role="rowgroup"
              className="md:divide-border/60 space-y-3 md:space-y-0 md:divide-y"
            >
              {visible.map((segment) => (
                <ExpandableActionItem
                  key={segment.id}
                  id={segment.id}
                  name={segment.name}
                  onEdit={() => {
                    setEditing(segment);
                    setDialog(true);
                  }}
                  onDelete={() => setDeleting(segment)}
                  className="bg-card rounded-2xl border p-4 shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_60%,transparent)] sm:p-5 md:grid md:grid-cols-[1fr_180px_120px_180px] md:items-center md:gap-4 md:rounded-none md:border-0 md:p-3 md:shadow-none"
                >
                  <div role="cell" className="min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/admin/segments/${segment.slug}`}
                        className="group/item flex min-w-0 flex-1 items-center gap-3 outline-hidden"
                      >
                        <IdentityTile
                          accentColor={normalizeMinistryColor(
                            segment.accentColor,
                          )}
                          iconKey={segment.iconKey}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="group-hover/item:text-primary block truncate text-base font-semibold underline-offset-4 group-hover/item:underline">
                            {segment.name}
                          </span>
                          <span className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs md:hidden">
                            <span className="font-mono">/{segment.slug}</span>
                            <span>
                              • {segment.memberCount}{" "}
                              {segment.memberCount === 1 ? "member" : "members"}
                            </span>
                          </span>
                        </span>
                      </Link>
                      <ExpandableActionItem.Trigger className="md:hidden" />
                    </div>
                    <ExpandableActionItem.MobileActions />
                  </div>
                  <div
                    role="cell"
                    className="text-muted-foreground hidden font-mono text-xs md:block"
                  >
                    /{segment.slug}
                  </div>
                  <div
                    role="cell"
                    className="text-muted-foreground hidden text-sm md:block"
                  >
                    {segment.memberCount}{" "}
                    {segment.memberCount === 1 ? "member" : "members"}
                  </div>
                  <div role="cell" className="hidden justify-end md:flex">
                    <ExpandableActionItem.DesktopActions />
                  </div>
                </ExpandableActionItem>
              ))}
            </div>
          </div>
        )}
        <Button
          className="fixed right-5 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-30 min-h-12 rounded-full px-5 shadow-[0_18px_36px_-14px_color-mix(in_oklch,var(--primary)_70%,transparent)] md:right-8 md:bottom-8"
          onClick={() => {
            setEditing(undefined);
            setDialog(true);
          }}
        >
          <Plus aria-hidden="true" className="size-5" />
          Add Segment
        </Button>
        <SegmentDialog
          key={`${dialog}-${editing?.id ?? "new"}`}
          open={dialog}
          onOpenChange={setDialog}
          item={editing}
        />
        <ConfirmationSheet
          open={Boolean(deleting)}
          onOpenChange={(open) => !open && setDeleting(undefined)}
          title="Delete segment?"
          description="Remove all members from this segment before deleting it. This cannot be undone."
          confirmLabel="Delete"
          pending={pending}
          pendingLabel="Deleting..."
          onConfirm={() => {
            if (!deleting) return;
            startTransition(async () => {
              const result = await deleteSegmentAction({ id: deleting.id });
              if (!result.success) {
                setToast(result.error);
                return;
              }
              setDeleting(undefined);
              setToast(result.message);
              router.refresh();
            });
          }}
        />
      </section>
    </ExpandableCoordinatorProvider>
  );
}
export function SegmentDetailManagement({
  segment,
}: {
  segment: SegmentDetail;
}) {
  const router = useRouter();
  const [toast, setToast] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [bulkSheetOpen, setBulkSheetOpen] = React.useState(false);
  const [conditions, setConditions] = React.useState<SegmentCondition[]>([
    { field: "birth_year", operator: "equals", value: "" },
  ]);
  const [matchingCount, setMatchingCount] = React.useState<number | null>(null);
  const [bulkError, setBulkError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (
      !bulkSheetOpen ||
      conditions.some(
        (condition, index) =>
          !condition.value.trim() || (index > 0 && !condition.connector),
      )
    ) {
      const timer = window.setTimeout(() => setMatchingCount(null));
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        setMatchingCount(
          await previewSegmentMembersByConditionsAction({
            segmentId: segment.id,
            conditions,
          }),
        );
      });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [bulkSheetOpen, conditions, segment.id]);

  function updateCondition(index: number, patch: Partial<SegmentCondition>) {
    setBulkError(null);
    setConditions((current) =>
      current.map((condition, conditionIndex) =>
        conditionIndex === index ? { ...condition, ...patch } : condition,
      ),
    );
  }

  function openConditionEditor() {
    setConditions(
      segment.conditions.length
        ? segment.conditions.map((condition) => ({ ...condition }))
        : [{ field: "birth_year", operator: "equals", value: "" }],
    );
    setMatchingCount(null);
    setBulkError(null);
    setBulkSheetOpen(true);
  }

  return (
    <section className="space-y-6" aria-label={`${segment.name} advanced add`}>
      {toast && (
        <StatusToast message={toast} onDismiss={() => setToast(null)} />
      )}
      <div className="border-border/70 bg-card space-y-5 rounded-2xl border p-5">
        <div>
          <h2 className="font-heading text-base font-semibold">Advanced add</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Save rules and add every active member who matches them.
          </p>
        </div>
        {segment.conditions.length > 0 && (
          <div className="space-y-3" aria-label="Saved segment conditions">
            {segment.conditions.map((condition, index) => {
              const field = CONDITION_FIELDS.find(
                (item) => item.value === condition.field,
              )?.label;
              const operator = OPERATORS_BY_FIELD[condition.field].find(
                (item) => item.value === condition.operator,
              )?.label;
              const value =
                condition.field === "gender"
                  ? condition.value === "female"
                    ? "Female"
                    : "Male"
                  : condition.value;

              return (
                <React.Fragment key={`${condition.field}-${index}`}>
                  {index > 0 && (
                    <div className="flex items-center gap-3 px-3">
                      <span
                        className="border-border/70 flex-1 border-t"
                        aria-hidden="true"
                      />
                      <span className="border-border/70 bg-card text-foreground flex h-10 min-w-24 items-center justify-center rounded-xl border px-4 text-sm font-semibold uppercase">
                        {condition.connector}
                      </span>
                      <span
                        className="border-border/70 flex-1 border-t"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                  <div className="border-border/70 bg-card space-y-3 rounded-xl border p-4 shadow-sm">
                    <div className="flex min-h-8 items-center">
                      <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                        Condition {index + 1}
                      </span>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)] gap-4">
                      {[
                        { label: "Attribute", text: field },
                        { label: "Operator", text: operator },
                        { label: "Value", text: value },
                      ].map((item) => (
                        <div key={item.label} className="min-w-0">
                          <p className="text-muted-foreground text-xs font-medium">
                            {item.label}
                          </p>
                          <p className="mt-1 text-sm font-semibold break-words">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          className="border-primary/30 bg-primary/10 text-primary hover:border-primary/45 hover:bg-primary/15 h-12 w-full"
          onClick={openConditionEditor}
        >
          <SlidersHorizontal aria-hidden="true" />
          {segment.conditions.length ? "Edit conditions" : "Set conditions"}
        </Button>
      </div>
      <Sheet open={bulkSheetOpen} onOpenChange={setBulkSheetOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="border-border/80 bg-card inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none border-t p-0 shadow-2xl focus:outline-hidden"
        >
          <div
            className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <div className="border-border/60 flex shrink-0 items-start justify-between border-b px-5 pt-3 pb-3">
            <SheetHeader className="p-0 text-left">
              <SheetTitle className="text-foreground text-lg font-bold">
                {segment.conditions.length
                  ? "Edit conditions"
                  : "Set conditions"}
              </SheetTitle>
              <SheetDescription className="text-muted-foreground mt-0.5 text-xs">
                Rules are evaluated from top to bottom for {segment.name}.
              </SheetDescription>
            </SheetHeader>
            <button
              type="button"
              disabled={pending}
              onClick={() => setBulkSheetOpen(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/40 focus-visible:ring-ring flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="bg-card flex-1 space-y-5 overflow-y-auto p-5">
            <div className="space-y-3">
              {conditions.map((condition, index) => {
                const field = CONDITION_FIELDS.find(
                  (item) => item.value === condition.field,
                )!;
                return (
                  <React.Fragment key={`${condition.field}-${index}`}>
                    {index > 0 && (
                      <div
                        className="flex items-center gap-3 px-3"
                        aria-label={`Connector before condition ${index + 1}`}
                      >
                        <span
                          className="border-border/70 flex-1 border-t"
                          aria-hidden="true"
                        />
                        <ConditionDropdown
                          label={`Condition ${index + 1} connector`}
                          value={condition.connector ?? "and"}
                          options={[
                            { value: "and", label: "AND" },
                            { value: "or", label: "OR" },
                          ]}
                          onChange={(connector) =>
                            updateCondition(index, { connector })
                          }
                          className="!h-10 w-24 font-semibold"
                        />
                        <span
                          className="border-border/70 flex-1 border-t"
                          aria-hidden="true"
                        />
                      </div>
                    )}
                    <div className="border-border/70 bg-card space-y-3 rounded-xl border p-3 shadow-sm">
                      <div className="flex min-h-8 items-center justify-between gap-3">
                        <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                          Condition {index + 1}
                        </span>
                        {conditions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive size-9 p-0"
                            onClick={() => {
                              setConditions((current) =>
                                current
                                  .filter(
                                    (_, conditionIndex) =>
                                      conditionIndex !== index,
                                  )
                                  .map((item, nextIndex) =>
                                    nextIndex === 0
                                      ? {
                                          field: item.field,
                                          operator: item.operator,
                                          value: item.value,
                                        }
                                      : item,
                                  ),
                              );
                              setBulkError(null);
                            }}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                            <span className="sr-only">
                              Remove condition {index + 1}
                            </span>
                          </Button>
                        )}
                      </div>
                      <div className="text-muted-foreground grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)] gap-2 text-xs font-medium">
                        <span>Attribute</span>
                        <span>Operator</span>
                        <span>Value</span>
                      </div>
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)] gap-2">
                        <ConditionDropdown
                          label={`Condition ${index + 1} attribute`}
                          value={condition.field}
                          options={CONDITION_FIELDS.map(({ value, label }) => ({
                            value,
                            label,
                          }))}
                          onChange={(nextField) => {
                            updateCondition(index, {
                              field: nextField,
                              operator: "equals",
                              value: nextField === "gender" ? "female" : "",
                            });
                          }}
                        />
                        <ConditionDropdown
                          label={`Condition ${index + 1} operator`}
                          value={condition.operator}
                          options={OPERATORS_BY_FIELD[condition.field]}
                          onChange={(operator) =>
                            updateCondition(index, { operator })
                          }
                        />
                        {condition.field === "gender" ? (
                          <ConditionDropdown
                            label={`Condition ${index + 1} value`}
                            value={condition.value}
                            options={[
                              { value: "female", label: "Female" },
                              { value: "male", label: "Male" },
                            ]}
                            onChange={(value) =>
                              updateCondition(index, { value })
                            }
                          />
                        ) : (
                          <Input
                            aria-label={`Condition ${index + 1} value`}
                            type={
                              condition.field === "birth_year"
                                ? "number"
                                : "text"
                            }
                            inputMode={
                              condition.field === "birth_year"
                                ? "numeric"
                                : undefined
                            }
                            min={
                              condition.field === "birth_year"
                                ? "1900"
                                : undefined
                            }
                            max={
                              condition.field === "birth_year"
                                ? "2100"
                                : undefined
                            }
                            value={condition.value}
                            onChange={(event) =>
                              updateCondition(index, {
                                value: event.target.value,
                              })
                            }
                            placeholder={field.placeholder}
                            className="h-12 text-base"
                          />
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <Button
                type="button"
                variant="outline"
                disabled={conditions.length >= 10}
                className="border-primary/30 bg-primary/10 text-primary hover:border-primary/45 hover:bg-primary/15 h-12 w-full"
                onClick={() =>
                  setConditions((current) => [
                    ...current,
                    {
                      field: "birth_year",
                      operator: "equals",
                      value: "",
                      connector: "and",
                    },
                  ])
                }
              >
                <Plus className="size-4" aria-hidden="true" />
                Add condition
              </Button>
            </div>
            {matchingCount !== null && (
              <div className="border-primary/20 bg-primary/5 rounded-xl border p-4 text-sm">
                <span className="font-semibold">{matchingCount}</span> active{" "}
                {matchingCount === 1 ? "member matches" : "members match"} this
                condition. Existing segment members will be skipped.
              </div>
            )}
            {bulkError && (
              <div
                role="alert"
                className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
              >
                {bulkError}
              </div>
            )}
          </div>
          <div className="border-border/70 bg-muted/30 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              disabled={pending || matchingCount === null}
              onClick={() =>
                startTransition(async () => {
                  const result = await saveSegmentConditionsAction({
                    segmentId: segment.id,
                    conditions,
                  });
                  if (!result.success) {
                    setBulkError(result.error);
                    return;
                  }
                  setBulkSheetOpen(false);
                  setToast(result.message);
                  router.refresh();
                })
              }
              className="min-h-11 w-full font-semibold"
            >
              {pending
                ? "Saving..."
                : matchingCount === null
                  ? "Complete all conditions"
                  : matchingCount === 0
                    ? "Save conditions"
                    : `Save and add ${matchingCount} ${matchingCount === 1 ? "member" : "members"}`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
