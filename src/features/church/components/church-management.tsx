"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  FolderTree,
  Globe,
  Info,
  Layers,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChurchState } from "../types";
import { CreateChurchDialog } from "./create-church-dialog";
import { EditChurchDialog } from "./edit-church-dialog";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusToast } from "@/components/ui/status-toast";
import { ChurchPageActions } from "./church-page-actions";

interface ChurchManagementProps {
  initialState: ChurchState;
  initialSuccessMessage?: string;
}

export function ChurchManagement({
  initialState,
  initialSuccessMessage,
}: ChurchManagementProps) {
  const router = useRouter();
  const state = initialState;
  const [successToast, setSuccessToast] = React.useState<{
    id: number;
    message: string;
  } | null>(
    initialSuccessMessage ? { id: 0, message: initialSuccessMessage } : null,
  );

  const handleActionSuccess = React.useCallback(
    (message: string) => {
      setSuccessToast({ id: Date.now(), message });
      router.refresh();
    },
    [router],
  );

  const dismissSuccessToast = React.useCallback(() => {
    setSuccessToast(null);
    if (initialSuccessMessage) {
      router.replace("/admin/church", { scroll: false });
    }
  }, [initialSuccessMessage, router]);

  // 1. Zero Church - Onboarding State
  if (state.status === "zero") {
    return (
      <>
        {successToast && (
          <StatusToast
            key={successToast.id}
            message={successToast.message}
            onDismiss={dismissSuccessToast}
          />
        )}
        <div className="mx-auto max-w-4xl space-y-6">
          <AdminPageHeader
            eyebrow="Organization profile"
            title="Church Settings"
            description="Set up the primary church profile to begin organization management."
          />

          <Card className="admin-panel-strong">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <Building2 className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-foreground text-xl font-bold">
                    No Church Configured
                  </CardTitle>
                  <CardDescription className="text-muted-foreground mt-0.5 text-sm">
                    The system requires one church profile to organize
                    ministries, terms, and members.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="admin-surface flex items-start gap-3 p-4 text-sm">
                <Info
                  className="text-primary size-5 shrink-0 translate-y-0.5"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className="text-foreground text-sm font-medium">
                    Configuration note
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    The administration shell operates on a single active church
                    model. The church name and slug identifier will classify
                    both internal and public directory records.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-border/70 flex flex-col justify-start border-t bg-transparent p-4 sm:flex-row sm:p-6">
              <CreateChurchDialog onSuccess={handleActionSuccess} />
            </CardFooter>
          </Card>
        </div>
      </>
    );
  }

  // 2. Multiple Churches - Configuration Error State
  if (state.status === "multiple") {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <AdminPageHeader
          eyebrow="Organization profile"
          title="Church Settings"
          description="Configuration error: multiple church records found in the database."
        />

        <Card className="admin-panel border-destructive/30 bg-destructive/5">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="bg-destructive/10 text-destructive flex size-10 shrink-0 items-center justify-center rounded-xl">
                <ShieldAlert className="size-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-destructive text-xl font-bold">
                  Configuration Error: {state.count} Churches Detected
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-0.5 text-sm">
                  The administration application supports exactly one active
                  church. The database currently contains {state.count} church
                  records. To ensure data integrity, mutations are locked until
                  records are consolidated.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="admin-surface p-4">
              <h2 className="text-foreground mb-3 text-sm font-semibold">
                Existing Church Records (Read-Only):
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-muted-foreground border-border border-b text-xs uppercase">
                    <tr>
                      <th className="pb-2 font-medium">Church Name</th>
                      <th className="pb-2 font-medium">Slug</th>
                      <th className="pb-2 font-medium">Identifier (ID)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {state.churches.map((c) => (
                      <tr key={c.id}>
                        <td className="text-foreground py-2.5 font-medium">
                          {c.name}
                        </td>
                        <td className="py-2.5">
                          <code className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                            {c.slug}
                          </code>
                        </td>
                        <td className="text-muted-foreground py-2.5 font-mono text-xs">
                          {c.id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-muted-foreground flex items-start gap-2 text-xs">
              <AlertCircle
                className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <span>
                Please contact a database administrator to merge or remove
                duplicate church records before proceeding with administration
                mutations.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. One Church - Standard Active State
  const { church } = state;
  const createdDateFormatted = formatDateTime(church.createdAt);
  const updatedDateFormatted = formatDateTime(church.updatedAt);

  return (
    <>
      {successToast && (
        <StatusToast
          key={successToast.id}
          message={successToast.message}
          onDismiss={dismissSuccessToast}
        />
      )}
      <div className="mx-auto max-w-4xl space-y-6">
        <AdminPageHeader
          eyebrow="Organization profile"
          title="Church Settings"
          description="Operational details and configuration for the active church profile."
          action={<ChurchPageActions />}
        />

        {/* Main Church Profile Card */}
        <Card className="admin-panel-strong">
          <CardHeader className="p-4 pb-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <Building2 className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  {/* User-entered database value displayed verbatim */}
                  <CardTitle className="text-foreground truncate text-xl font-bold sm:text-2xl">
                    {church.name}
                  </CardTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground flex items-center gap-1 font-mono">
                      <Globe className="size-3.5" aria-hidden="true" />
                      <span>/{church.slug}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                      Active
                    </span>
                  </div>
                </div>
              </div>
              <EditChurchDialog
                church={church}
                onSuccess={handleActionSuccess}
                compactTrigger
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-4 pt-0 sm:p-6">
            {/* Metadata Row */}
            <div className="admin-surface grid grid-cols-2 overflow-hidden">
              <div className="border-border/70 space-y-1 border-r p-3 sm:p-4">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Calendar className="size-3.5" aria-hidden="true" />
                  Created
                </span>
                <time
                  dateTime={church.createdAt}
                  className="text-foreground block text-sm leading-5 font-medium"
                >
                  {createdDateFormatted}
                </time>
              </div>
              <div className="space-y-1 p-3 sm:p-4">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Calendar className="size-3.5" aria-hidden="true" />
                  Updated
                </span>
                <time
                  dateTime={church.updatedAt}
                  className="text-foreground block text-sm leading-5 font-medium"
                >
                  {updatedDateFormatted}
                </time>
              </div>
            </div>

            {/* Compact Statistics Row inside Primary Card */}
            <div className="space-y-3">
              <h2 className="text-foreground text-sm font-semibold">
                Linked Organizational Data
              </h2>
              <div className="admin-surface grid grid-cols-1 overflow-hidden sm:grid-cols-3">
                <div className="border-border/70 flex items-center gap-3 border-b p-4 sm:border-r sm:border-b-0">
                  <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Layers className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-foreground text-base font-bold">
                      {church.ministryCount}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Ministries
                    </div>
                  </div>
                </div>

                <div className="border-border/70 flex items-center gap-3 border-b p-4 sm:border-r sm:border-b-0">
                  <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Users className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-foreground text-base font-bold">
                      {church.memberCount}
                    </div>
                    <div className="text-muted-foreground text-xs">Members</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4">
                  <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <FolderTree className="size-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-foreground text-base font-bold">
                      {church.segmentCount}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Member groups
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          {/* Dependency Status Footer */}
          <CardFooter className="border-border/70 border-t bg-transparent p-4 sm:p-6">
            <div className="text-xs">
              {!church.isDeletable ? (
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <Info className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    Deletion is restricted while linked ministries, members, or
                    groups exist.
                  </span>
                </p>
              ) : (
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <Info className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    This church record has no linked dependent history and may
                    be safely deleted.
                  </span>
                </p>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}, ${values.hour}:${values.minute}`;
}
