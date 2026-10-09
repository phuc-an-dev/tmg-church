"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { debounce, useQueryStates } from "nuqs";
import { Filter, ArrowUpRight } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberAvatar } from "@/components/shared/member-avatar";
import {
  NavigationTabs,
  NavigationTabButton,
} from "@/components/shared/navigation-tabs";
import { OptionPickerSheet } from "@/components/shared/option-picker-sheet";
import { PaginationCard } from "@/components/shared/pagination-card";
import { ResponsiveEditor } from "@/components/shared/responsive-editor";
import { FloatingCreateButton } from "@/components/shared/floating-create-button";
import { careSearchParams } from "../search-params";
import { loadCareDetailAction } from "../actions";
import type {
  CareCase,
  CareDetail as CareDetailData,
  CarePageData,
  CareSuggestion,
  CareTab,
} from "../types";
import { CareDetail } from "./care-detail";
import { CareEditor } from "./care-editor";
import { CareDetailSkeleton, CareListSkeleton } from "./care-skeleton";

export function CareList({
  data,
  fixedGroup = false,
}: {
  data: CarePageData;
  fixedGroup?: boolean;
}) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [query, setQuery] = useQueryStates(careSearchParams, {
    shallow: false,
    startTransition: startNavigation,
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [suggestion, setSuggestion] = useState<CareSuggestion | null>(null);
  const [selected, setSelected] = useState<CareCase | null>(null);
  const [detail, setDetail] = useState<CareDetailData | null>(null);
  const [detailError, setDetailError] = useState("");
  const [loadingDetail, startDetail] = useTransition();
  const detailRequest = useRef(0);
  const scope = data.scope;
  const termPath = `/portal/ministries/${scope.ministrySlug}/terms/${scope.termSlug}/care`;
  const tabs: { value: CareTab; label: string }[] = [
    { value: "open", label: "Open" },
    ...(!scope.readOnly
      ? [{ value: "suggestions" as const, label: "Suggestions" }]
      : []),
    { value: "history", label: "History" },
  ];
  function openDetail(item: CareCase) {
    const request = ++detailRequest.current;
    setSelected(item);
    setDetail(null);
    setDetailError("");
    startDetail(async () => {
      try {
        const result = await loadCareDetailAction({
          ministrySlug: scope.ministrySlug,
          termSlug: scope.termSlug,
          careSlug: item.slug,
        });
        if (request !== detailRequest.current) return;
        if (result.success) setDetail(result.data);
        else setDetailError(result.error);
      } catch {
        if (request === detailRequest.current)
          setDetailError("Unable to load this follow-up. Please try again.");
      }
    });
  }
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <AdminPageHeader
        title="Care"
        description={`${data.group?.name ?? scope.ministryName} · ${scope.termName}`}
        backLink={{ href: "/portal", label: "Portal" }}
      />
      {scope.readOnly && (
        <p className="bg-muted rounded-xl p-3 text-sm">
          Read-only: this term has closed. Follow-ups and private notes remain
          in this term.
        </p>
      )}
      <NavigationTabs aria-label="Care views">
        {tabs.map((tab) => (
          <NavigationTabButton
            key={tab.value}
            active={query.tab === tab.value}
            className="min-h-11 sm:min-h-11"
            onClick={() => void setQuery({ tab: tab.value, page: 1 })}
          >
            {tab.label}
          </NavigationTabButton>
        ))}
      </NavigationTabs>
      <div className="flex gap-2">
        {query.tab !== "suggestions" && (
          <Input
            aria-label="Search members"
            placeholder="Search members"
            value={query.q}
            maxLength={100}
            className="min-h-11 min-w-0 flex-1 text-base"
            onChange={(event) =>
              void setQuery(
                { q: event.target.value, page: 1 },
                { limitUrlUpdates: debounce(300) },
              )
            }
          />
        )}
        {scope.canCoordinate && !fixedGroup && (
          <Button
            variant="outline"
            className="min-h-11 min-w-11 shrink-0 px-3 text-base"
            onClick={() => setFilterOpen(true)}
            aria-label="Filter groups"
          >
            <Filter className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Groups</span>
          </Button>
        )}
      </div>
      {!fixedGroup && data.group && (
        <p className="text-muted-foreground text-sm">
          Group: {data.group.name}
        </p>
      )}
      {navigating ? (
        <CareListSkeleton contentOnly />
      ) : (
        <>
          {data.filters.tab === "suggestions" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.suggestionItems.map((item) => (
                <article
                  key={`${item.groupId}-${item.memberId}`}
                  className="border-border bg-card min-w-0 space-y-4 rounded-2xl border p-4"
                >
                  <div className="flex items-start gap-3">
                    <MemberAvatar />
                    <div className="min-w-0">
                      <h2 className="font-semibold break-words">
                        {item.memberName}
                      </h2>
                      <p className="text-muted-foreground text-sm break-words">
                        {item.groupName}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Three consecutive absences
                    </p>
                    <ul className="text-muted-foreground space-y-1 text-sm">
                      {item.sourceEvidence.sessions.map((session) => (
                        <li key={session.id}>{session.date} · Absent</li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    className="min-h-11 w-full text-base"
                    onClick={() => setSuggestion(item)}
                  >
                    Create follow-up
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openDetail(item)}
                  className="border-border bg-card hover:bg-muted/40 min-w-0 space-y-3 rounded-2xl border p-4 text-left transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <MemberAvatar />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold break-words">
                        {item.memberName}
                      </h2>
                      <p className="text-muted-foreground text-sm break-words">
                        {item.groupName ?? "Group not recorded"}
                      </p>
                    </div>
                    <ArrowUpRight
                      className="text-muted-foreground size-4 shrink-0"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-muted rounded-full px-2 py-1 font-medium">
                      {item.status === "in_progress"
                        ? "In progress"
                        : item.status === "resolved"
                          ? "Resolved"
                          : "Open"}
                    </span>
                    {item.status !== "resolved" &&
                      item.nextContactDate &&
                      item.nextContactDate < data.currentDate && (
                        <span className="bg-destructive/10 text-destructive rounded-full px-2 py-1 font-medium">
                          Overdue
                        </span>
                      )}
                  </div>
                  <div className="text-muted-foreground space-y-1 text-sm">
                    <p className="break-words">
                      Assignee: {item.assigneeName ?? "Not assigned"}
                    </p>
                    <p>
                      Next contact: {item.nextContactDate ?? "Not scheduled"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {data.totalCount === 0 && (
            <div className="border-border rounded-2xl border border-dashed p-6 text-center">
              <p className="font-medium">
                {data.filters.tab === "suggestions"
                  ? "No absence suggestions"
                  : data.filters.tab === "history"
                    ? "No resolved follow-ups"
                    : "No open follow-ups"}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                {data.filters.q || data.group
                  ? "Try another search or group."
                  : data.filters.tab === "suggestions"
                    ? "Suggestions appear after three consecutive recorded absences."
                    : "Follow-ups will appear here when they are created."}
              </p>
            </div>
          )}
          <PaginationCard
            page={data.page}
            pageSize={data.pageSize}
            count={data.totalCount}
            onPageChange={(page) => void setQuery({ page })}
          />
        </>
      )}
      <OptionPickerSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        key={query.group ?? "all"}
        title="Filter groups"
        value={query.group}
        options={[
          { value: null, label: "All groups" },
          ...scope.groups.map((group) => ({
            value: group.slug,
            label: group.name,
          })),
        ]}
        onChange={(group) => void setQuery({ group, page: 1 })}
        itemLabelClassName="text-base"
      />
      {!scope.readOnly && scope.groups.length > 0 && (
        <FloatingCreateButton
          className="text-base"
          onClick={() => setCreateOpen(true)}
        >
          Create follow-up
        </FloatingCreateButton>
      )}
      {(createOpen || suggestion) && (
        <CareEditor
          mode="create"
          scope={scope}
          group={data.group}
          suggestion={suggestion ?? undefined}
          onClose={() => {
            setCreateOpen(false);
            setSuggestion(null);
          }}
          onSaved={() => router.refresh()}
        />
      )}
      <ResponsiveEditor
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            detailRequest.current++;
            setSelected(null);
            setDetail(null);
          }
        }}
        title="Follow-up"
        footer={
          <Button
            className="min-h-11 w-full text-base"
            variant="outline"
            onClick={() => {
              detailRequest.current++;
              setSelected(null);
              setDetail(null);
            }}
          >
            Done
          </Button>
        }
        maxWidthClass="sm:max-w-2xl"
      >
        {loadingDetail ? (
          <CareDetailSkeleton />
        ) : detail ? (
          <CareDetail key={detail.case.id} initialDetail={detail} />
        ) : detailError ? (
          <div className="space-y-3 py-3">
            <p role="alert" className="text-destructive text-sm">
              {detailError}
            </p>
            {selected && (
              <Button
                variant="outline"
                className="min-h-11 text-base"
                onClick={() => openDetail(selected)}
              >
                Retry
              </Button>
            )}
          </div>
        ) : null}
        {selected && (
          <Link
            className="text-primary mt-4 inline-flex min-h-11 items-center text-sm underline"
            href={`${termPath}/${selected.slug}`}
          >
            Open follow-up page
          </Link>
        )}
      </ResponsiveEditor>
    </div>
  );
}
