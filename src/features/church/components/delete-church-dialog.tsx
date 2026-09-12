"use client";

import * as React from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { deleteChurchAction } from "../actions";
import type { ChurchViewModel } from "../types";

interface DeleteChurchDialogProps {
  church: ChurchViewModel;
  onSuccess?: (message: string) => void;
  triggerButton?: React.ReactNode;
}

export function DeleteChurchDialog({
  church,
  onSuccess,
  triggerButton,
}: DeleteChurchDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [confirmationInput, setConfirmationInput] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Genuinely exact string match
  const isMatched = confirmationInput === church.name;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isPending) {
      setOpen(newOpen);
      if (!newOpen) {
        setConfirmationInput("");
        setErrorMessage(null);
      }
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatched) return;

    setErrorMessage(null);
    setIsPending(true);

    try {
      const result = await deleteChurchAction({
        id: church.id,
        confirmationName: confirmationInput,
      });

      if (!result.success) {
        setErrorMessage(result.error);
      } else {
        const successMsg = result.message || "Church deleted successfully.";
        setOpen(false);
        onSuccess?.(successMsg);
      }
    } catch {
      setErrorMessage("An unexpected error occurred while deleting church.");
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
        form="delete-church-form"
        variant="destructive"
        disabled={!isMatched || isPending}
        className="min-h-[44px] w-full gap-2 sm:w-auto"
      >
        {isPending ? (
          <>
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span>Deleting church...</span>
          </>
        ) : (
          <>
            <Trash2 className="size-4" aria-hidden="true" />
            <span>Delete Church</span>
          </>
        )}
      </Button>
    </>
  );

  return (
    <>
      {triggerButton ? (
        <div onClick={() => setOpen(true)} className="inline-block">
          {triggerButton}
        </div>
      ) : (
        <Button
          variant="destructive"
          onClick={() => setOpen(true)}
          className="min-h-[44px] w-full gap-2 sm:w-auto"
          disabled={!church.isDeletable}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          <span>Delete Church</span>
        </Button>
      )}

      <ResponsiveEditor
        open={open}
        onOpenChange={handleOpenChange}
        title="Delete Church"
        description="This action will permanently delete this church record. This cannot be undone."
        footer={footerActions}
      >
        <form
          id="delete-church-form"
          onSubmit={handleDelete}
          noValidate
          className="space-y-4 py-2"
        >
          <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-center gap-3 rounded-lg border p-3.5 text-sm">
            <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
            <p>
              Deleting the church will remove all basic church metadata. Ensure
              you genuinely wish to proceed.
            </p>
          </div>

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
              htmlFor="confirm-church-name"
              className="text-foreground text-sm font-medium"
            >
              To confirm, type the exact church name:{" "}
              <strong className="text-primary font-mono font-semibold select-all">
                {church.name}
              </strong>
            </Label>
            <Input
              id="confirm-church-name"
              placeholder="Type church name exactly..."
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              disabled={isPending}
              className="font-mono text-base"
              autoComplete="off"
              aria-invalid={confirmationInput.length > 0 && !isMatched}
              aria-describedby="confirm-church-name-hint"
            />
            <p
              id="confirm-church-name-hint"
              className="text-muted-foreground text-xs"
            >
              Matching is case-sensitive and must match all characters exactly.
            </p>
          </div>
        </form>
      </ResponsiveEditor>
    </>
  );
}
