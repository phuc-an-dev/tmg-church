"use client";

import * as React from "react";
import { Loader2, Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { generateVietnameseSlug } from "@/lib/slug";
import { createChurchAction } from "../actions";

interface CreateChurchDialogProps {
  onSuccess?: (message: string) => void;
}

export function CreateChurchDialog({ onSuccess }: CreateChurchDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [customSlug, setCustomSlug] = React.useState("");
  const [showAdvancedSlug, setShowAdvancedSlug] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<
    Record<string, string[]>
  >({});

  const previewSlug = customSlug.trim() || generateVietnameseSlug(name);

  const resetForm = () => {
    setName("");
    setCustomSlug("");
    setShowAdvancedSlug(false);
    setErrorMessage(null);
    setFieldErrors({});
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isPending) {
      setOpen(newOpen);
      if (!newOpen) {
        resetForm();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setIsPending(true);

    try {
      const result = await createChurchAction({
        name: name.trim(),
        slug: customSlug.trim() || undefined,
      });

      if (!result.success) {
        setErrorMessage(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
      } else {
        const successMsg = result.message || "Church created successfully.";
        setOpen(false);
        resetForm();
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
        form="create-church-form"
        disabled={isPending || !name.trim()}
        className="min-h-[44px] w-full gap-2 sm:w-auto"
      >
        {isPending ? (
          <>
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span>Creating church...</span>
          </>
        ) : (
          <>
            <Plus className="size-4" aria-hidden="true" />
            <span>Create church</span>
          </>
        )}
      </Button>
    </>
  );

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="min-h-[44px] w-full gap-2 sm:w-auto"
      >
        <Plus className="size-4" aria-hidden="true" />
        <span>Create Church</span>
      </Button>

      <ResponsiveEditor
        open={open}
        onOpenChange={handleOpenChange}
        title="Create Church"
        description="Enter the church name to begin initial administration setup."
        footer={footerActions}
      >
        <form
          id="create-church-form"
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
              htmlFor="create-church-name"
              className="text-foreground text-sm font-medium"
            >
              Church name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="create-church-name"
              placeholder="e.g. TMG Church"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              className="h-12 px-4 text-lg"
              aria-invalid={Boolean(fieldErrors.name?.[0])}
              aria-describedby={
                fieldErrors.name?.[0] ? "create-church-name-error" : undefined
              }
              autoFocus
              required
            />
            {fieldErrors.name?.[0] && (
              <p
                id="create-church-name-error"
                className="text-destructive text-xs"
                role="alert"
              >
                {fieldErrors.name[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Generated URL slug:{" "}
                <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                  {previewSlug || "..."}
                </code>
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAdvancedSlug(!showAdvancedSlug)}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring min-h-[44px] gap-1.5 px-3 text-xs focus-visible:ring-2 focus-visible:outline-hidden"
                disabled={isPending}
              >
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                <span>{showAdvancedSlug ? "Simple" : "Advanced"}</span>
              </Button>
            </div>

            {showAdvancedSlug && (
              <div className="border-border bg-muted/30 space-y-2 rounded-lg border p-3">
                <Label
                  htmlFor="create-church-custom-slug"
                  className="text-muted-foreground text-xs font-medium"
                >
                  Custom slug
                </Label>
                <Input
                  id="create-church-custom-slug"
                  placeholder="tmg-church"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  disabled={isPending}
                  className="h-12 px-4 font-mono text-lg"
                  aria-invalid={Boolean(fieldErrors.slug?.[0])}
                  aria-describedby={
                    fieldErrors.slug?.[0]
                      ? "create-church-slug-error"
                      : undefined
                  }
                />
                <p className="text-muted-foreground text-xs">
                  Lowercase letters, numbers, and single hyphens only.
                </p>
                {fieldErrors.slug?.[0] && (
                  <p
                    id="create-church-slug-error"
                    className="text-destructive text-xs"
                    role="alert"
                  >
                    {fieldErrors.slug[0]}
                  </p>
                )}
              </div>
            )}
          </div>
        </form>
      </ResponsiveEditor>
    </>
  );
}
