"use client";

import * as React from "react";
import { Archive, Loader2, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { GenderDropdown } from "./gender-dropdown";
import {
  archiveMemberAction,
  restoreMemberAction,
  updateMemberAction,
} from "../actions";

export interface EditableMember {
  id: string;
  fullName: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  archivedAt?: string | null;
}

export function MemberEditor({
  member,
  open,
  onClose,
  onSuccess,
}: {
  member: EditableMember;
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  return (
    <MemberEditorModal
      key={member.id}
      member={member}
      open={open}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function MemberEditorModal({
  member,
  open,
  onClose,
  onSuccess,
}: {
  member: EditableMember;
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
  const [dateOfBirth, setDateOfBirth] = React.useState(
    member.dateOfBirth ?? "",
  );
  const [gender, setGender] = React.useState(member.gender ?? "");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setFieldErrors({});

    const result = await updateMemberAction({
      id: member.id,
      fullName,
      phone,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
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
          <Label htmlFor="member-date-of-birth">Date of birth</Label>
          <Input
            id="member-date-of-birth"
            type="date"
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
            disabled={isSaving}
            aria-invalid={Boolean(fieldErrors.dateOfBirth?.[0])}
            aria-describedby={
              fieldErrors.dateOfBirth?.[0]
                ? "member-date-of-birth-error"
                : undefined
            }
            className="h-11"
          />
          {fieldErrors.dateOfBirth?.[0] && (
            <p
              id="member-date-of-birth-error"
              role="alert"
              className="text-destructive text-xs"
            >
              {fieldErrors.dateOfBirth[0]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-gender">Gender</Label>
          <GenderDropdown
            id="member-gender"
            value={gender}
            onChange={setGender}
            disabled={isSaving}
          />
        </div>
      </form>
    </ResponsiveEditor>
  );
}

export function ArchiveConfirmDialog({
  member,
  open,
  onClose,
  onSuccess,
}: {
  member: EditableMember | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!member) return null;

  async function handleArchive() {
    if (!member) return;
    setIsPending(true);
    setError(null);
    const res = await archiveMemberAction({ id: member.id });
    setIsPending(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onSuccess(res.message);
  }

  return (
    <ConfirmationSheet
      open={open}
      onOpenChange={(next) => !next && !isPending && onClose()}
      title="Archive member"
      description={
        <>
          Are you sure you want to archive <strong>{member.fullName}</strong>?
          Archived members are hidden from active ministry assignments, but can
          be restored at any time.
        </>
      }
      confirmLabel="Archive member"
      pending={isPending}
      pendingLabel="Archiving..."
      confirmIcon={<Archive className="size-4" aria-hidden="true" />}
      onConfirm={handleArchive}
    >
      {error && (
        <div
          role="alert"
          className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
        >
          {error}
        </div>
      )}
    </ConfirmationSheet>
  );
}

export function RestoreConfirmDialog({
  member,
  open,
  onClose,
  onSuccess,
}: {
  member: EditableMember | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!member) return null;

  async function handleRestore() {
    if (!member) return;
    setIsPending(true);
    setError(null);
    const res = await restoreMemberAction({ id: member.id });
    setIsPending(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onSuccess(res.message);
  }

  return (
    <ConfirmationSheet
      open={open}
      onOpenChange={(next) => !next && !isPending && onClose()}
      title="Restore member"
      description={
        <>
          Are you sure you want to restore <strong>{member.fullName}</strong>?
          They will be restored as an active member in the church directory.
        </>
      }
      confirmLabel="Restore member"
      pending={isPending}
      pendingLabel="Restoring..."
      variant="default"
      confirmIcon={<RotateCcw className="size-4" aria-hidden="true" />}
      onConfirm={handleRestore}
    >
      {error && (
        <div
          role="alert"
          className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
        >
          {error}
        </div>
      )}
    </ConfirmationSheet>
  );
}
