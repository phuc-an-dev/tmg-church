"use client";

import * as React from "react";
import {
  Check,
  MailPlus,
  Search,
  SlidersHorizontal,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { PaginationCard } from "@/components/shared/pagination-card";
import {
  ExpandableActionItem,
  ExpandableCoordinatorProvider,
} from "@/components/shared/expandable-action-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  createMemberInvitationAction,
  revokeMemberInvitationAction,
} from "@/features/auth/invitation-actions";
import type {
  InvitationCandidate,
  InvitationStatus,
} from "../authorization-queries";

interface InvitationManagementProps {
  churchId: string;
  candidates: InvitationCandidate[];
  statuses: InvitationStatus[];
  actorRole: string;
}

function getStatus(invitation: InvitationStatus | undefined): string {
  if (!invitation) return "Not invited";
  if (invitation.consumedAt) return "Activated";
  if (invitation.revokedAt) return "Revoked";
  if (new Date(invitation.expiresAt).getTime() <= Date.now()) return "Expired";
  return "Pending";
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  Activated:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Pending:
    "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Revoked: "border-destructive/20 bg-destructive/10 text-destructive",
  Expired: "border-border/60 bg-muted/40 text-muted-foreground",
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "Not invited", label: "Not invited" },
  { value: "Pending", label: "Pending" },
  { value: "Activated", label: "Activated" },
  { value: "Expired", label: "Expired" },
  { value: "Revoked", label: "Revoked" },
];

function getLatestStatus(
  statuses: InvitationStatus[],
  memberProfileId: string,
): InvitationStatus | undefined {
  return statuses.find((status) => status.memberProfileId === memberProfileId);
}

export function InvitationManagement({
  churchId,
  candidates,
  statuses,
  actorRole,
}: InvitationManagementProps) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [draftStatus, setDraftStatus] = React.useState("all");
  const [filterOpen, setFilterOpen] = React.useState(false);
  const filterButtonRef = React.useRef<HTMLButtonElement>(null);
  const pageSize = 10;
  const canManage = actorRole === "master_admin" || actorRole === "admin";

  const normalizedSearch = search.trim().toLowerCase();
  const filteredCandidates = candidates
    .map((candidate) => ({
      candidate,
      status: getStatus(getLatestStatus(statuses, candidate.memberProfileId)),
    }))
    .filter(
      ({ candidate, status }) =>
        (statusFilter === "all" || status === statusFilter) &&
        (candidate.fullName.toLowerCase().includes(normalizedSearch) ||
          (candidate.email ?? "").toLowerCase().includes(normalizedSearch)),
    )
    // Members with an email surface first; stable sort keeps name order.
    .sort(
      (a, b) =>
        Number(Boolean(b.candidate.email)) - Number(Boolean(a.candidate.email)),
    );
  const visibleCandidates = filteredCandidates.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  function openFilter() {
    setDraftStatus(statusFilter);
    setFilterOpen(true);
  }

  function applyFilter() {
    setStatusFilter(draftStatus);
    setPage(1);
    setFilterOpen(false);
  }

  const runAction = async (
    memberProfileId: string,
    action: "send" | "revoke",
    invitationId?: string,
  ) => {
    setPendingId(memberProfileId);
    setMessage(null);
    const result =
      action === "send"
        ? await createMemberInvitationAction({ churchId, memberProfileId })
        : await revokeMemberInvitationAction({
            churchId,
            invitationId: invitationId ?? "",
          });
    setPendingId(null);
    setMessage(
      result.success ? (result.message ?? "Invitation updated.") : result.error,
    );
    if (result.success) window.location.reload();
  };

  if (!candidates.length) {
    return (
      <EmptyState
        icon={Users}
        title="No invitation candidates"
        description="Members without portal access will appear here, ready to be invited."
      />
    );
  }

  return (
    <div className="space-y-3">
      {message && <p className="text-muted-foreground text-sm">{message}</p>}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            className="bg-card h-12 pl-9 text-base shadow-xs"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search members"
            aria-label="Search members"
          />
        </div>
        <Button
          ref={filterButtonRef}
          type="button"
          variant="outline"
          onClick={openFilter}
          className="bg-card hover:bg-card min-h-12 shrink-0 gap-2 px-3.5"
          aria-label={
            statusFilter === "all"
              ? "Filter members"
              : `Filter members (${STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter})`
          }
        >
          <SlidersHorizontal
            className="text-muted-foreground size-4"
            aria-hidden="true"
          />
          <span>Filter</span>
          {statusFilter !== "all" && (
            <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-xs font-semibold">
              1
            </span>
          )}
        </Button>
      </div>
      <ExpandableCoordinatorProvider
        resetKey={`${search}-${page}-${statusFilter}-${pendingId ?? ""}`}
      >
        <div className="space-y-3 md:space-y-0 md:overflow-hidden md:rounded-xl md:border">
          {visibleCandidates.map(({ candidate, status }) => {
            const latest = getLatestStatus(statuses, candidate.memberProfileId);
            const pending = pendingId === candidate.memberProfileId;
            const canRevoke = Boolean(latest) && status === "Pending";
            const hasActions = canManage && Boolean(candidate.email);
            const badgeStyle = STATUS_BADGE_STYLES[status];

            const identityCell = (
              <div className="flex min-w-0 items-center gap-3">
                <MemberAvatar gender={candidate.gender} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {candidate.fullName}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {candidate.email ?? "No email recorded"}
                  </span>
                </span>
              </div>
            );

            const statusBadge = badgeStyle ? (
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeStyle}`}
              >
                {status}
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">{status}</span>
            );

            if (!hasActions) {
              return (
                <div
                  key={candidate.memberProfileId}
                  role="row"
                  className="bg-card flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-[0_12px_28px_-24px_color-mix(in_oklch,var(--foreground)_60%,transparent)] md:grid md:grid-cols-[1fr_140px] md:items-center md:gap-4 md:rounded-none md:border-0 md:border-b md:p-3 md:shadow-none md:last:border-b-0"
                >
                  {identityCell}
                  <div className="hidden md:block">{statusBadge}</div>
                </div>
              );
            }

            return (
              <ExpandableActionItem
                key={candidate.memberProfileId}
                id={`invitation-${candidate.memberProfileId}`}
                name={candidate.fullName}
                onAdditionalAction={() =>
                  runAction(candidate.memberProfileId, "send")
                }
                additionalActionLabel={
                  status === "Pending" ? "Resend invitation" : "Send invitation"
                }
                additionalActionSectionLabel="Invitation"
                additionalActionIcon={MailPlus}
                onDelete={
                  canRevoke && latest
                    ? () =>
                        runAction(
                          candidate.memberProfileId,
                          "revoke",
                          latest.id,
                        )
                    : undefined
                }
                deleteLabel="Revoke invitation"
                deleteIcon={UserMinus}
                deleteDisabled={pending}
                className="p-4 md:grid md:grid-cols-[1fr_140px_44px] md:items-center md:gap-4 md:border-b md:last:border-b-0"
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  {identityCell}
                  <ExpandableActionItem.Trigger className="md:hidden" />
                </div>
                <ExpandableActionItem.MobileActions />
                <div className="hidden md:block">{statusBadge}</div>
                <div className="hidden justify-end md:flex">
                  <ExpandableActionItem.DesktopActions />
                </div>
              </ExpandableActionItem>
            );
          })}
          {filteredCandidates.length === 0 && (
            <div className="border-border/60 bg-muted/20 rounded-xl border border-dashed p-6 text-center">
              <p className="text-muted-foreground text-sm">
                No members match this search or filter.
              </p>
            </div>
          )}
        </div>
        <PaginationCard
          page={page}
          pageSize={pageSize}
          count={filteredCandidates.length}
          itemLabel="members"
          onPageChange={setPage}
        />
      </ExpandableCoordinatorProvider>

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
          className="border-border/80 bg-card inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none border-t p-0 shadow-2xl focus:outline-hidden"
        >
          <div
            className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <div className="border-border/70 flex shrink-0 items-center justify-between border-b px-5 py-3">
            <SheetHeader className="p-0 text-left">
              <SheetTitle className="text-foreground text-lg font-bold">
                Filter members
              </SheetTitle>
              <SheetDescription className="text-muted-foreground mt-0.5 text-xs">
                Show members by invitation status. Members with an email are
                listed first.
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
                Invitation status
              </legend>
              <div className="divide-border/60 border-border/60 bg-muted/20 divide-y overflow-hidden rounded-xl border">
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDraftStatus(option.value)}
                    className={`flex min-h-14 w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition-colors ${
                      draftStatus === option.value
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    {option.label}
                    {draftStatus === option.value && (
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
              className="min-h-[44px]"
              onClick={() => setDraftStatus("all")}
            >
              Reset
            </Button>
            <Button
              type="button"
              className="min-h-[44px]"
              onClick={applyFilter}
            >
              Apply filter
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
