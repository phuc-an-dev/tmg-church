"use client";
import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQueryStates } from "nuqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import { StatusToast } from "@/components/ui/status-toast";
import {
  ExpandableActionItem,
  ExpandableCoordinatorProvider,
} from "@/components/shared/expandable-action-item";
import { sessionSearchParams } from "../search-params";
import { deleteSessionAction, saveSessionAction } from "../actions";
import type { SessionItem, SessionPage, SessionTermOption } from "../types";
export function SessionManagement({
  result,
  terms,
}: {
  result: SessionPage;
  terms: SessionTermOption[];
}) {
  const [query, setQuery] = useQueryStates(sessionSearchParams);
  const [edit, setEdit] = React.useState<SessionItem | null | "new">(null);
  const [remove, setRemove] = React.useState<SessionItem | null>(null);
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState("");
  const [term, setTerm] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [toast, setToast] = React.useState("");
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [draftTerm, setDraftTerm] = React.useState("");
  const filterButtonRef = React.useRef<HTMLButtonElement>(null);
  function open(item: SessionItem | "new") {
    setEdit(item);
    setTitle(item === "new" ? "" : item.title);
    setDate(item === "new" ? "" : item.sessionDate);
    setTerm(item === "new" ? (terms[0]?.id ?? "") : item.termId);
  }
  async function save() {
    setPending(true);
    const r = await saveSessionAction({
      id: edit !== "new" ? edit?.id : undefined,
      ministryTermId: term,
      title,
      sessionDate: date,
    });
    setPending(false);
    if (r.success) {
      setEdit(null);
      setToast(r.message ?? "");
    } else setToast(r.error ?? "");
  }
  async function removeSession() {
    if (!remove) return;
    setPending(true);
    const r = await deleteSessionAction({ id: remove.id });
    setPending(false);
    if (r.success) {
      setRemove(null);
      setToast(r.message ?? "");
    } else setToast(r.error ?? "");
  }
  function openFilter() {
    setDraftTerm(query.term);
    setFilterOpen(true);
  }
  function applyFilter() {
    void setQuery({ term: draftTerm, page: 1 });
    setFilterOpen(false);
  }
  const hasActiveFilter = Boolean(query.term);
  const totalPages = Math.max(1, Math.ceil(result.count / result.pageSize));
  const rangeStart =
    result.count === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.page * result.pageSize, result.count);
  return (
    <section className="space-y-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="flex items-center gap-2 border-b pb-5">
        <div className="relative min-w-0 flex-1">
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            className="bg-card h-12 pl-9 text-base shadow-xs"
            value={query.q}
            onChange={(e) => void setQuery({ q: e.target.value, page: 1 })}
            placeholder="Search sessions"
            aria-label="Search sessions"
          />
        </div>
        <Button
          ref={filterButtonRef}
          type="button"
          variant="outline"
          onClick={openFilter}
          className="bg-card hover:bg-card min-h-12 shrink-0 gap-2 px-3.5 md:hidden"
          aria-label={
            hasActiveFilter ? "Filter sessions (1 active)" : "Filter sessions"
          }
        >
          <SlidersHorizontal
            className="text-muted-foreground size-4"
            aria-hidden="true"
          />
          <span>Filter</span>
          {hasActiveFilter && (
            <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-xs font-semibold">
              1
            </span>
          )}
        </Button>
      </div>
      <div className="hidden flex-wrap gap-2 md:flex">
        <Button
          variant={query.term ? "outline" : "default"}
          onClick={() => setQuery({ term: "", page: 1 })}
        >
          All terms
        </Button>
        {terms.map((t) => (
          <Button
            key={t.id}
            variant={query.term === t.routeKey ? "default" : "outline"}
            onClick={() => setQuery({ term: t.routeKey, page: 1 })}
          >
            {t.ministryName}: {t.name}
          </Button>
        ))}
      </div>
      {result.items.length === 0 ? (
        <div className="admin-surface py-12 text-center">
          <p className="font-medium">
            {query.q ? "No sessions match this search." : "No sessions yet."}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {query.q
              ? "Clear or change your search to see more records."
              : "Create the first one-off session to begin attendance."}
          </p>
        </div>
      ) : (
        <>
          <ExpandableCoordinatorProvider
            resetKey={`${query.q}-${query.term}-${query.page}-${query.pageSize}`}
          >
            <div className="grid gap-3 md:hidden">
              {result.items.map((item) => (
                <SessionCard
                  key={item.id}
                  item={item}
                  onEdit={() => open(item)}
                  onDelete={() => setRemove(item)}
                />
              ))}
            </div>
          </ExpandableCoordinatorProvider>
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3">Session</th>
                  <th>Term</th>
                  <th>Date</th>
                  <th>Participants</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="p-3">
                      <Link
                        className="font-medium underline"
                        href={`/admin/sessions/${item.slug}`}
                      >
                        {item.title}
                      </Link>
                    </td>
                    <td>
                      {item.ministryName} · {item.termName}
                    </td>
                    <td>{item.sessionDate}</td>
                    <td>{item.participantCount}</td>
                    <td className="flex gap-2 p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => open(item)}
                      >
                        Edit
                      </Button>
                      {item.canDelete && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRemove(item)}
                        >
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="border-border/70 bg-card overflow-hidden rounded-2xl border shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_55%,transparent)]">
        <div className="flex items-center justify-between gap-3 p-4">
          <span className="text-muted-foreground text-sm">
            Showing{" "}
            <strong className="text-foreground font-medium">
              {rangeStart}–{rangeEnd}
            </strong>{" "}
            of{" "}
            <strong className="text-foreground font-medium">
              {result.count}
            </strong>{" "}
            sessions
          </span>
          <div
            className="border-input bg-muted/35 flex shrink-0 items-center rounded-xl border p-1"
            aria-label="Results per page"
          >
            {[20, 50, 100].map((pageSize) => {
              const active = query.pageSize === pageSize;
              return (
                <button
                  key={pageSize}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Show ${pageSize} sessions per page`}
                  onClick={() => void setQuery({ pageSize, page: 1 })}
                  className={
                    active
                      ? "bg-primary text-primary-foreground min-h-9 min-w-10 rounded-lg px-2 text-sm font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground min-h-9 min-w-10 rounded-lg px-2 text-sm font-medium transition-colors"
                  }
                >
                  {pageSize}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t p-4">
          <Button
            variant="outline"
            className="bg-secondary hover:bg-secondary/80 disabled:bg-muted/40 min-h-12 w-full rounded-xl border-0"
            disabled={result.page <= 1}
            onClick={() => void setQuery({ page: result.page - 1 })}
          >
            <ChevronLeft aria-hidden="true" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          <span
            className="border-input bg-card flex min-h-12 min-w-20 items-center justify-center rounded-xl border px-3 text-base font-semibold"
            aria-live="polite"
          >
            {Math.min(result.page, totalPages)}
            <span className="text-muted-foreground px-1">/</span>
            {totalPages}
          </span>
          <Button
            variant="outline"
            className="bg-secondary hover:bg-secondary/80 disabled:bg-muted/40 min-h-12 w-full rounded-xl border-0"
            disabled={result.page >= totalPages}
            onClick={() => void setQuery({ page: result.page + 1 })}
          >
            Next
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
      <ResponsiveEditor
        open={Boolean(edit)}
        onOpenChange={(v) => !v && setEdit(null)}
        title={edit === "new" ? "Create session" : "Edit session"}
        description="One-off ministry term session"
        mobileMinHeightClass="min-h-[65dvh]"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setEdit(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={pending || !term || !title || !date}
            >
              {pending ? "Saving..." : "Save session"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              className="min-h-11 text-base"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-date">Date</Label>
            <DatePicker
              id="session-date"
              value={date}
              onChange={setDate}
              placeholder="Select session date"
            />
          </div>
          <div className="space-y-2">
            <Label>Term</Label>
            <div className="flex flex-wrap gap-2">
              {terms.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  variant={term === t.id ? "default" : "outline"}
                  onClick={() => setTerm(t.id)}
                >
                  {t.ministryName}: {t.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </ResponsiveEditor>
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            if (filterButtonRef.current) {
              event.preventDefault();
              filterButtonRef.current.focus();
            }
          }}
          className="border-border/80 bg-card inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none border-t p-0 shadow-2xl focus:outline-hidden md:hidden"
        >
          <div
            className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <div className="border-border/70 flex shrink-0 items-center justify-between border-b px-5 py-3">
            <SheetHeader className="p-0 text-left">
              <SheetTitle className="text-foreground text-lg font-bold">
                Filter sessions
              </SheetTitle>
              <SheetDescription className="text-muted-foreground mt-0.5 text-xs">
                Show sessions from a selected ministry term.
              </SheetDescription>
            </SheetHeader>
            <SheetClose asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground hover:bg-muted/40 focus-visible:ring-ring flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
                aria-label="Close"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </SheetClose>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <fieldset className="space-y-2">
              <legend className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Ministry term
              </legend>
              <div className="divide-border/60 border-border/60 bg-muted/20 divide-y overflow-hidden rounded-xl border">
                <button
                  type="button"
                  onClick={() => setDraftTerm("")}
                  className={`flex min-h-11 w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition-colors ${
                    !draftTerm
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted/50 text-foreground"
                  }`}
                >
                  All terms
                  {!draftTerm && (
                    <Check className="size-4" aria-hidden="true" />
                  )}
                </button>
                {terms.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDraftTerm(item.routeKey)}
                    className={`flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors ${
                      draftTerm === item.routeKey
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <span>
                      {item.ministryName}: {item.name}
                    </span>
                    {draftTerm === item.routeKey && (
                      <Check className="size-4 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="border-border/70 bg-muted/30 grid shrink-0 grid-cols-2 gap-3 border-t px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraftTerm("")}
            >
              Reset
            </Button>
            <Button type="button" onClick={applyFilter}>
              Apply filter
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <ConfirmationSheet
        open={Boolean(remove)}
        onOpenChange={(v) => !v && setRemove(null)}
        title="Delete session"
        description="This is allowed only while the session has no participants or historical attendance."
        confirmLabel="Delete session"
        pending={pending}
        onConfirm={removeSession}
        confirmIcon={<Trash2 className="size-4" />}
      />
      {toast && <StatusToast message={toast} onDismiss={() => setToast("")} />}
      <Button
        className="fixed right-5 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-30 min-h-12 rounded-full px-5 shadow-[0_18px_36px_-14px_color-mix(in_oklch,var(--primary)_70%,transparent)] md:right-8 md:bottom-8"
        onClick={() => open("new")}
      >
        <Plus aria-hidden="true" className="size-5" />
        Add session
      </Button>
    </section>
  );
}
function SessionCard({
  item,
  onEdit,
  onDelete,
}: {
  item: SessionItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const formattedDate = format(parseISO(item.sessionDate), "MMM d, yyyy");
  return (
    <ExpandableActionItem
      id={item.id}
      name={item.title}
      onEdit={onEdit}
      onDelete={item.canDelete ? onDelete : undefined}
      className="p-4 sm:p-5"
    >
      <div role="cell" className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/admin/sessions/${item.slug}`}
            className="group/item flex min-w-0 flex-1 items-center gap-3 outline-hidden"
          >
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
              <CalendarDays className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="group-hover/item:text-primary block truncate text-base font-semibold">
                {item.title}
              </span>
              <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                {item.ministryName} · {item.termName}
              </span>
              <span className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span>{formattedDate}</span>
                <span>· {item.participantCount} participants</span>
              </span>
            </span>
          </Link>
          <ExpandableActionItem.Trigger />
        </div>
        <ExpandableActionItem.MobileActions />
      </div>
    </ExpandableActionItem>
  );
}
