"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import type { ChurchViewModel } from "../types";
import type {
  InvitationCandidate,
  InvitationStatus,
} from "../authorization-queries";
import { DeleteChurchDialog } from "./delete-church-dialog";
import { InvitationManagement } from "./invitation-management";

interface ChurchAdvancedSettingsProps {
  church: ChurchViewModel;
  invitationCandidates: InvitationCandidate[];
  invitationStatuses: InvitationStatus[];
  actorRole: string;
}

export function ChurchAdvancedSettings({
  church,
  invitationCandidates,
  invitationStatuses,
  actorRole,
}: ChurchAdvancedSettingsProps) {
  const router = useRouter();

  const handleDeleteSuccess = React.useCallback(() => {
    router.replace("/admin/church?status=deleted");
  }, [router]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <AdminPageHeader
        title="Church Administration"
        description="Sensitive organization controls are separated from routine profile editing."
        backLink={{ href: "/admin/church", label: "Church" }}
      />

      <section className="space-y-3">
        <div className="px-1">
          <h2 className="text-base font-semibold">Member invitations</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Send a one-time account activation link to an existing member email.
          </p>
        </div>
        <InvitationManagement
          churchId={church.id}
          candidates={invitationCandidates}
          statuses={invitationStatuses}
          actorRole={actorRole}
        />
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <h2 className="text-destructive text-base font-semibold">
            Delete church
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Permanently remove {church.name}. This action is intentionally
            isolated from everyday Church settings.
          </p>
        </div>
        <div className="admin-surface p-4 text-sm">
          {church.isDeletable ? (
            <p className="text-muted-foreground leading-6">
              This church has no linked ministries, members, or groups. You may
              continue to the exact-name confirmation step.
            </p>
          ) : (
            <p className="text-muted-foreground leading-6">
              Deletion is unavailable while linked ministries, members, or
              groups exist. Remove those dependencies before returning to this
              page.
            </p>
          )}
        </div>
        <DeleteChurchDialog church={church} onSuccess={handleDeleteSuccess} />
      </section>
    </div>
  );
}
