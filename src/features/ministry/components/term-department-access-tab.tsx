"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserMinus } from "lucide-react";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { DestructiveActionButton } from "@/components/shared/item-action-buttons";
import { ListTable, ListTableBody } from "@/components/shared/list-table";
import { Button } from "@/components/ui/button";
import { StatusToast } from "@/components/ui/status-toast";
import {
  getTermDepartmentDelegationsAction,
  setMinistryOperationDelegationAction,
  type DepartmentLeaderDelegation,
} from "../delegation-actions";

export function TermDepartmentAccessTab({
  ministryTermId,
}: {
  ministryTermId: string;
}) {
  const router = useRouter();
  const [leaders, setLeaders] = React.useState<DepartmentLeaderDelegation[]>(
    [],
  );
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState("");

  React.useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      const result = await getTermDepartmentDelegationsAction({
        ministryTermId,
      });
      if (!isMounted) return;
      setLoading(false);
      if (!result.success) {
        const message = result.error ?? "Unable to load Department Leaders.";
        setLoadError(message);
        setToast(message);
        return;
      }
      setLoadError(null);
      setLeaders(result.data ?? []);
    };
    void fetchData();
    return () => {
      isMounted = false;
    };
  }, [ministryTermId]);

  async function refresh() {
    const result = await getTermDepartmentDelegationsAction({ ministryTermId });
    if (result.success) {
      setLeaders(result.data ?? []);
    }
  }

  async function setPermission(
    leader: DepartmentLeaderDelegation,
    granted: boolean,
  ) {
    setPendingId(leader.memberProfileId);
    const result = await setMinistryOperationDelegationAction({
      ministryTermId,
      departmentId: leader.departmentId,
      memberProfileId: leader.memberProfileId,
      granted,
    });
    setPendingId(null);
    if (!result.success)
      return setToast(result.error ?? "Unable to update Department access.");
    setToast(granted ? "Permission granted." : "Permission revoked.");
    router.refresh();
    await refresh();
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-muted-foreground rounded-xl border p-4 text-sm">
          Loading Department Leaders…
        </p>
      ) : loadError ? (
        <p
          className="text-destructive rounded-xl border p-4 text-sm"
          role="alert"
        >
          {loadError}
        </p>
      ) : leaders.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
          No Department Leaders are assigned to this term.
        </p>
      ) : (
        <ListTable label="Department Leader permissions">
          <ListTableBody>
            {leaders.map((leader) => (
              <div
                key={leader.departmentId}
                role="row"
                className="bg-card flex min-h-14 items-center gap-3 rounded-xl border p-3 md:rounded-none md:border-0 md:px-4"
              >
                <MemberAvatar gender={leader.gender} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {leader.memberName}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {leader.departmentName} · /{leader.memberSlug}
                  </p>
                </div>
                {leader.granted ? (
                  <DestructiveActionButton
                    className="w-auto shrink-0"
                    label="Revoke"
                    icon={UserMinus}
                    disabled={pendingId === leader.memberProfileId}
                    onClick={() => void setPermission(leader, false)}
                  />
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 shrink-0 gap-2"
                    disabled={pendingId === leader.memberProfileId}
                    onClick={() => void setPermission(leader, true)}
                  >
                    <ShieldCheck aria-hidden="true" />
                    Grant
                  </Button>
                )}
              </div>
            ))}
          </ListTableBody>
        </ListTable>
      )}
      {toast && <StatusToast message={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}
