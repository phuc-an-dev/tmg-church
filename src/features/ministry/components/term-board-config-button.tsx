"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Check,
  Church,
  ClipboardPen,
  Crown,
  HandHeart,
  HeartHandshake,
  Megaphone,
  Music2,
  PowerOff,
  Settings2,
  UsersRound,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationSheet } from "@/components/shared/confirmation-sheet";
import { FloatingCreateButton } from "@/components/shared/floating-create-button";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { Switch } from "@/components/ui/switch";
import { configureTermBoardAction } from "../actions";
import { TERM_BOARD_ROLE_OPTIONS } from "../board-roles";

export const BOARD_ROLE_ICONS = {
  ministry_head: Crown,
  secretary: ClipboardPen,
  treasurer: Wallet,
  social_support_commissioner: HandHeart,
  small_groups_commissioner: UsersRound,
  pastoral_commissioner: BookOpen,
  music_commissioner: Music2,
  worship_commissioner: Church,
  visitation_care_commissioner: HeartHandshake,
  evangelism_commissioner: Megaphone,
};

export function TermBoardConfigButton({
  termId,
  roles,
  closed,
  occupied,
}: {
  termId: string;
  roles: string[] | null;
  closed: boolean;
  occupied: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [disabling, setDisabling] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>(roles ?? []);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const enabled = roles !== null;
  const disableBlocked = enabled && occupied;

  async function save() {
    setPending(true);
    setError(null);
    try {
      const result = await configureTermBoardAction({
        termId,
        roles: selected,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Unable to update the Executive Board.");
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setPending(true);
    setError(null);
    try {
      const result = await configureTermBoardAction({ termId, roles: null });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDisabling(false);
      router.refresh();
    } catch {
      setError("Unable to disable the Executive Board.");
    } finally {
      setPending(false);
    }
  }

  function openEditor() {
    setSelected(roles ?? []);
    setError(null);
    setOpen(true);
  }

  return (
    <div>
      <div className="bg-card flex min-h-20 items-center justify-between gap-4 rounded-2xl border p-4">
        <div className="min-w-0">
          <label htmlFor={`board-enabled-${termId}`} className="font-semibold">
            Executive Board
          </label>
          <p
            id={`board-status-${termId}`}
            className="text-muted-foreground mt-1 text-sm"
          >
            {closed
              ? "Closed terms cannot be changed."
              : disableBlocked
                ? "Unassign all board members before turning it off."
                : enabled
                  ? "Enabled"
                  : "Off"}
          </p>
        </div>
        <Switch
          id={`board-enabled-${termId}`}
          checked={enabled}
          disabled={closed || pending || disableBlocked}
          aria-describedby={`board-status-${termId}`}
          onCheckedChange={(checked) => {
            if (checked) {
              openEditor();
            } else {
              setError(null);
              setDisabling(true);
            }
          }}
        />
      </div>
      {enabled && !closed && (
        <FloatingCreateButton
          icon={<Settings2 className="size-5" aria-hidden="true" />}
          onClick={openEditor}
        >
          Edit board roles
        </FloatingCreateButton>
      )}
      <ResponsiveEditor
        open={open}
        onOpenChange={setOpen}
        title={roles ? "Edit board roles" : "Enable Executive Board"}
        description="Select the roles used in this ministry term. Vacant roles remain visible."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={save}
              disabled={pending || selected.length === 0}
            >
              {pending ? "Saving..." : "Save roles"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          {TERM_BOARD_ROLE_OPTIONS.map((option) => {
            const checked = selected.includes(option.value);
            const Icon = BOARD_ROLE_ICONS[option.value];
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={checked}
                onClick={() =>
                  setSelected((current) =>
                    checked
                      ? current.filter((role) => role !== option.value)
                      : [...current, option.value],
                  )
                }
                className={`flex min-h-14 w-full items-center justify-between rounded-xl border px-4 text-left text-base ${checked ? "border-primary bg-primary/5" : "border-border bg-card"}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Icon
                    className="text-primary size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{option.label}</span>
                </span>
                {checked && (
                  <Check
                    className="text-primary size-5 shrink-0"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </ResponsiveEditor>
      <ConfirmationSheet
        open={disabling}
        onOpenChange={(nextOpen) => {
          setDisabling(nextOpen);
          if (!nextOpen) setError(null);
        }}
        title="Disable Executive Board"
        description="Selected roles will be cleared. You can enable the board again by choosing roles."
        confirmLabel="Disable board"
        confirmIcon={<PowerOff className="size-4" aria-hidden="true" />}
        pending={pending}
        onConfirm={disable}
      >
        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
      </ConfirmationSheet>
    </div>
  );
}
