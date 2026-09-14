"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Search,
  Users,
} from "lucide-react";
import { debounce, useQueryStates } from "nuqs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { updateMemberAction } from "../actions";
import { memberSearchParams } from "../search-params";
import type { MemberItem, MemberPageResult } from "../types";

interface MemberManagementProps {
  result: MemberPageResult;
  editedMember: MemberItem | null;
  requestedEditId: string;
  invalidEdit: boolean;
}

type SortColumn = "full_name" | "birth_year";

function SortIcon({
  active,
  order,
}: {
  active: boolean;
  order: "asc" | "desc";
}) {
  if (!active) return null;
  const Icon = order === "asc" ? ArrowUp : ArrowDown;
  return <Icon className="size-3.5" aria-hidden="true" />;
}

function MemberEditor({
  member,
  open,
  onClose,
  onSuccess,
}: {
  member: MemberItem;
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<
    Record<string, string[]>
  >({});
  const [fullName, setFullName] = React.useState(member.fullName);
  const [phone, setPhone] = React.useState(member.phone ?? "");
  const [birthYear, setBirthYear] = React.useState(
    member.birthYear === null ? "" : String(member.birthYear),
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setFieldErrors({});

    const normalizedBirthYear = birthYear.trim()
      ? Number(birthYear.trim())
      : null;
    const result = await updateMemberAction({
      id: member.id,
      fullName,
      phone,
      birthYear: normalizedBirthYear,
    });

    if (!result.success) {
      setErrorMessage(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    onSuccess(result.message);
  }

  const footer = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        disabled={isSaving}
        className="min-h-[44px]"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form="edit-member-form"
        disabled={isSaving || !fullName.trim()}
        className="min-h-[44px] gap-2"
      >
        {isSaving ? (
          <Loader2
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <Pencil className="size-4" aria-hidden="true" />
        )}
        <span>{isSaving ? "Saving changes..." : "Save changes"}</span>
      </Button>
    </>
  );

  return (
    <ResponsiveEditor
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSaving) onClose();
      }}
      title="Edit Member"
      description="Update the member's profile details."
      footer={footer}
    >
      <form
        id="edit-member-form"
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4 py-2"
      >
        {errorMessage && (
          <div
            role="alert"
            className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
          >
            {errorMessage}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="member-full-name">
            Full name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="member-full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={isSaving}
            aria-invalid={Boolean(fieldErrors.fullName?.[0])}
            aria-describedby={
              fieldErrors.fullName?.[0] ? "member-full-name-error" : undefined
            }
            className="h-11"
            required
          />
          {fieldErrors.fullName?.[0] && (
            <p
              id="member-full-name-error"
              role="alert"
              className="text-destructive text-xs"
            >
              {fieldErrors.fullName[0]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-phone">Phone</Label>
          <Input
            id="member-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={isSaving}
            autoComplete="tel"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-birth-year">Birth year</Label>
          <Input
            id="member-birth-year"
            type="number"
            inputMode="numeric"
            min={1900}
            max={2100}
            value={birthYear}
            onChange={(event) => setBirthYear(event.target.value)}
            disabled={isSaving}
            aria-invalid={Boolean(fieldErrors.birthYear?.[0])}
            aria-describedby={
              fieldErrors.birthYear?.[0] ? "member-birth-year-error" : undefined
            }
            className="h-11"
          />
          {fieldErrors.birthYear?.[0] && (
            <p
              id="member-birth-year-error"
              role="alert"
              className="text-destructive text-xs"
            >
              {fieldErrors.birthYear[0]}
            </p>
          )}
        </div>
      </form>
    </ResponsiveEditor>
  );
}

export function MemberManagement({
  result,
  editedMember,
  requestedEditId,
  invalidEdit,
}: MemberManagementProps) {
  const [pending, startTransition] = React.useTransition();
  const [query, setQuery] = useQueryStates(memberSearchParams, {
    history: "replace",
    shallow: false,
    clearOnDefault: true,
    startTransition,
  });
  const searchParams = useSearchParams();
  const [notice, setNotice] = React.useState<string | null>(null);
  const canonicalizedUrlRef = React.useRef<string | null>(null);

  const selectedMember = query.edit
    ? editedMember?.id === query.edit
      ? editedMember
      : (result.items.find((member) => member.id === query.edit) ?? null)
    : null;

  React.useEffect(() => {
    const currentUrl = searchParams.toString();
    if (canonicalizedUrlRef.current === currentUrl) return;
    canonicalizedUrlRef.current = currentUrl;

    const patch: Record<string, string | number | null> = {};
    const rawQ = searchParams.get("q");
    const rawSort = searchParams.get("sort");
    const rawOrder = searchParams.get("order");
    const rawPage = searchParams.get("page");
    const rawEdit = searchParams.get("edit");

    if (rawQ === "") patch.q = "";
    if (
      rawSort !== null &&
      !(["full_name", "birth_year"] as const).includes(rawSort as SortColumn)
    ) {
      patch.sort = "full_name";
    } else if (rawSort === "full_name") {
      patch.sort = "full_name";
    }
    if (rawOrder !== null && rawOrder !== "asc" && rawOrder !== "desc") {
      patch.order = "asc";
    } else if (rawOrder === "asc") {
      patch.order = "asc";
    }
    if (
      rawPage !== null &&
      (!/^[1-9]\d*$/.test(rawPage) || Number(rawPage) !== result.page)
    ) {
      patch.page = result.page;
    }
    if (rawEdit === "") patch.edit = null;

    const shouldShowInvalidEdit = Boolean(
      invalidEdit && requestedEditId && query.edit === requestedEditId,
    );
    if (shouldShowInvalidEdit) {
      patch.edit = null;
    }

    if (Object.keys(patch).length > 0) {
      void setQuery(patch as never, {
        history: "replace",
        shallow: false,
      }).then(() => {
        if (shouldShowInvalidEdit) {
          setNotice("The requested member was not found or is unavailable.");
        }
      });
    }
  }, [
    invalidEdit,
    query.edit,
    requestedEditId,
    result.page,
    searchParams,
    setQuery,
  ]);

  const totalPages = Math.max(1, Math.ceil(result.count / result.pageSize));
  const rangeStart =
    result.count === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.page * result.pageSize, result.count);

  function updateSort(column: SortColumn) {
    const order =
      query.sort === column && query.order === "asc" ? "desc" : "asc";
    void setQuery(
      { sort: column, order, page: 1 },
      { history: "replace", shallow: false },
    );
  }

  function openEditor(memberId: string) {
    setNotice(null);
    void setQuery({ edit: memberId }, { history: "push", shallow: false });
  }

  function closeEditor() {
    void setQuery({ edit: null }, { history: "push", shallow: false });
  }

  const visibleNotice =
    notice ??
    (invalidEdit
      ? "The requested member was not found or is unavailable."
      : null);

  return (
    <>
      <Card className="admin-panel overflow-hidden">
        <CardHeader className="border-border/70 gap-4 border-b p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-foreground text-lg font-bold">
                Member directory
              </h2>
              <p className="text-muted-foreground text-sm">
                Search, sort, and update active member profiles.
              </p>
            </div>
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Users className="size-4" aria-hidden="true" />
              <span>{result.count} active members</span>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query.q}
              onChange={(event) =>
                void setQuery(
                  { q: event.target.value, page: 1 },
                  {
                    history: "replace",
                    shallow: false,
                    limitUrlUpdates: debounce(300),
                  },
                )
              }
              placeholder="Search by member name"
              aria-label="Search members by name"
              className="h-11 pl-9"
            />
          </div>

          {visibleNotice && (
            <div
              role="status"
              className="border-border bg-muted/50 text-foreground rounded-lg border px-3 py-2 text-sm"
            >
              {visibleNotice}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <div
            className={pending ? "opacity-60 transition-opacity" : undefined}
            aria-busy={pending}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr className="border-border/70 border-b">
                    <th scope="col" className="px-4 py-3 font-medium sm:px-6">
                      <button
                        type="button"
                        onClick={() => updateSort("full_name")}
                        className="hover:text-foreground focus-visible:ring-ring inline-flex min-h-9 items-center gap-1.5 rounded-md focus-visible:ring-2 focus-visible:outline-none"
                      >
                        Name
                        <SortIcon
                          active={query.sort === "full_name"}
                          order={query.order}
                        />
                      </button>
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Phone
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      <button
                        type="button"
                        onClick={() => updateSort("birth_year")}
                        className="hover:text-foreground focus-visible:ring-ring inline-flex min-h-9 items-center gap-1.5 rounded-md focus-visible:ring-2 focus-visible:outline-none"
                      >
                        Birth year
                        <SortIcon
                          active={query.sort === "birth_year"}
                          order={query.order}
                        />
                      </button>
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right font-medium sm:px-6"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((member) => (
                    <tr
                      key={member.id}
                      className="border-border/70 hover:bg-muted/20 border-b last:border-b-0"
                    >
                      <td className="text-foreground px-4 py-3 font-medium sm:px-6">
                        {member.fullName}
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {member.phone ?? "Not provided"}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 tabular-nums">
                        {member.birthYear ?? "Not provided"}
                      </td>
                      <td className="px-4 py-3 text-right sm:px-6">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditor(member.id)}
                          className="gap-2"
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.items.length === 0 && (
              <div className="px-4 py-14 text-center sm:px-6">
                <Users
                  className="text-muted-foreground/60 mx-auto size-8"
                  aria-hidden="true"
                />
                <p className="text-foreground mt-3 font-medium">
                  No members found
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {query.q
                    ? "Try a different member name."
                    : "Active member profiles will appear here."}
                </p>
              </div>
            )}
          </div>

          <div className="border-border/70 flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-muted-foreground text-sm tabular-nums">
              Showing {rangeStart}-{rangeEnd} of {result.count}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending || result.page <= 1}
                onClick={() =>
                  void setQuery(
                    { page: result.page - 1 },
                    { history: "replace", shallow: false },
                  )
                }
                aria-label="Previous member page"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                Previous
              </Button>
              <span className="text-muted-foreground min-w-24 text-center text-sm tabular-nums">
                Page {result.page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending || result.page >= totalPages}
                onClick={() =>
                  void setQuery(
                    { page: result.page + 1 },
                    { history: "replace", shallow: false },
                  )
                }
                aria-label="Next member page"
              >
                Next
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedMember && (
        <MemberEditor
          key={selectedMember.id}
          member={selectedMember}
          open={Boolean(query.edit)}
          onClose={closeEditor}
          onSuccess={(message) => {
            setNotice(message);
            void setQuery({ edit: null }, { history: "push", shallow: false });
          }}
        />
      )}
    </>
  );
}
