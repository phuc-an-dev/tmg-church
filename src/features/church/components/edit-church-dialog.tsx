"use client";

import * as React from "react";
import { AlertTriangle, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { updateChurchAction } from "../actions";
import type { ChurchViewModel } from "../types";

interface EditChurchDialogProps {
  church: ChurchViewModel;
  onSuccess?: (message: string) => void;
  compactTrigger?: boolean;
}

export function EditChurchDialog({
  church,
  onSuccess,
  compactTrigger = false,
}: EditChurchDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(church.name);
  const [slug, setSlug] = React.useState(church.slug);
  const [isPending, setIsPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<
    Record<string, string[]>
  >({});

  const handleOpenChange = (newOpen: boolean) => {
    if (!isPending) {
      setOpen(newOpen);
      setName(church.name);
      setSlug(church.slug);
      setErrorMessage(null);
      setFieldErrors({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setIsPending(true);

    try {
      const result = await updateChurchAction({
        id: church.id,
        name: name.trim(),
        slug: slug.trim(),
      });

      if (!result.success) {
        setErrorMessage(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
      } else {
        const successMsg =
          result.message || "Church settings updated successfully.";
        setOpen(false);
        onSuccess?.(successMsg);
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  const footerActions = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => handleOpenChange(false)}
        disabled={isPending}
        className="min-h-[44px] w-full sm:w-auto"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form="edit-church-form"
        disabled={
          isPending ||
          !name.trim() ||
          !slug.trim() ||
          (name.trim() === church.name && slug.trim() === church.slug)
        }
        className="min-h-[44px] w-full gap-2 sm:w-auto"
      >
        {isPending ? (
          <>
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span>Saving changes...</span>
          </>
        ) : (
          <>
            <Pencil className="size-4" aria-hidden="true" />
            <span>Save changes</span>
          </>
        )}
      </Button>
    </>
  );

  return (
    <>
      <Button
        variant={compactTrigger ? "default" : "outline"}
        onClick={() => setOpen(true)}
        className={
          compactTrigger
            ? "min-h-11 gap-2 rounded-lg px-4"
            : "min-h-[44px] w-auto gap-2"
        }
        title={compactTrigger ? "Edit church" : undefined}
      >
        <Pencil className="size-4" aria-hidden="true" />
        <span>Edit</span>
      </Button>

      <ResponsiveEditor
        open={open}
        onOpenChange={handleOpenChange}
        title="Edit Church Settings"
        description="Update church name or configure the unique identifier slug."
        footer={footerActions}
      >
        <form
          id="edit-church-form"
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4 py-2"
        >
          {errorMessage && (
            <div
              className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <div className="space-y-2">
            <Label
              htmlFor="edit-church-name"
              className="text-foreground text-sm font-medium"
            >
              Church name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-church-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              className="h-12 px-4 text-lg"
              aria-invalid={Boolean(fieldErrors.name?.[0])}
              aria-describedby={
                fieldErrors.name?.[0] ? "edit-church-name-error" : undefined
              }
              required
            />
            {fieldErrors.name?.[0] && (
              <p
                id="edit-church-name-error"
                className="text-destructive text-xs"
                role="alert"
              >
                {fieldErrors.name[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="edit-church-slug"
              className="text-foreground text-sm font-medium"
            >
              Identifier slug <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-church-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={isPending}
              className="h-12 px-4 font-mono text-lg"
              aria-invalid={Boolean(fieldErrors.slug?.[0])}
              aria-describedby={
                fieldErrors.slug?.[0] ? "edit-church-slug-error" : undefined
              }
              required
            />
            {fieldErrors.slug?.[0] && (
              <p
                id="edit-church-slug-error"
                className="text-destructive text-xs"
                role="alert"
              >
                {fieldErrors.slug[0]}
              </p>
            )}

            {slug !== church.slug && (
              <div
                className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400"
                role="alert"
              >
                <AlertTriangle
                  className="size-4 shrink-0 translate-y-0.5"
                  aria-hidden="true"
                />
                <p>
                  <strong>Warning:</strong> Changing the slug will alter all
                  existing public links to this church.
                </p>
              </div>
            )}
          </div>
        </form>
      </ResponsiveEditor>
    </>
  );
}
