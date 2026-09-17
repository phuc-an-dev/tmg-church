"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusToast } from "@/components/ui/status-toast";
import { saveSessionAction } from "../actions";

export type SessionScope = {
  groupId?: string;
  departmentId?: string;
  ministryTermId: string;
};

export function SessionEditorDrawer({
  open,
  onOpenChange,
  scope,
  session,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: SessionScope;
  session?: { id: string; title: string; sessionDate: string } | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState(session?.title ?? "");
  const [sessionDate, setSessionDate] = React.useState(
    session?.sessionDate ?? "",
  );
  const [pending, setPending] = React.useState(false);
  const [toast, setToast] = React.useState("");

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setTitle("");
      setSessionDate("");
    }
    onOpenChange(nextOpen);
  }

  async function save() {
    setPending(true);
    const result = await saveSessionAction({
      id: session?.id,
      ministryTermId: scope.ministryTermId,
      termGroupId: scope.groupId,
      termDepartmentId: scope.departmentId,
      title,
      sessionDate,
    });
    setPending(false);

    if (!result.success || !result.slug) {
      setToast(result.error ?? "Unable to save this session.");
      return;
    }

    handleOpenChange(false);
    if (session) {
      onSaved?.();
      router.refresh();
    } else {
      router.push(`/admin/sessions/${result.slug}`);
    }
  }

  return (
    <>
      <ResponsiveEditor
        open={open}
        onOpenChange={handleOpenChange}
        title={session ? "Edit session" : "Create session"}
        description={
          session
            ? "Update the session details."
            : "Create a session for the selected context."
        }
        mobileMinHeightClass="min-h-[65dvh]"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={save}
              disabled={pending || !title.trim() || !sessionDate}
            >
              {pending
                ? "Saving..."
                : session
                  ? "Save changes"
                  : "Save session"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-session-title">Title</Label>
            <Input
              id="group-session-title"
              className="min-h-11 text-base"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-session-date">Date</Label>
            <DatePicker
              id="group-session-date"
              value={sessionDate}
              onChange={setSessionDate}
              placeholder="Select session date"
            />
          </div>
        </div>
      </ResponsiveEditor>
      {toast && <StatusToast message={toast} onDismiss={() => setToast("")} />}
    </>
  );
}
