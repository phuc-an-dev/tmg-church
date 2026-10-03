"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  Globe,
  Info,
  Pencil,
  Settings2,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusToast } from "@/components/ui/status-toast";
import { Button } from "@/components/ui/button";
import {
  ExpandableActionItem,
  ExpandableCoordinatorProvider,
  useExpandableCoordinator,
  useExpandableItem,
} from "@/components/shared/expandable-action-item";
import { ExpandableCardPanel } from "@/components/shared/expandable-card-panel";
import type { ChurchState } from "../types";
import { CreateChurchDialog } from "./create-church-dialog";
import { EditChurchDialog } from "./edit-church-dialog";

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
  const [editOpen, setEditOpen] = React.useState(false);

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
        <div className="mx-auto max-w-4xl space-y-8">
          <AdminPageHeader
            title="Church Settings"
            description="Set up the primary church profile to begin organization management."
          />

          <section className="space-y-3">
            <div className="px-1">
              <h2 className="text-base font-semibold">No church configured</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                The system requires one church profile to organize ministries,
                terms, and members.
              </p>
            </div>
            <div className="admin-panel space-y-4 p-4 sm:p-6">
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
              <CreateChurchDialog onSuccess={handleActionSuccess} />
            </div>
          </section>
        </div>
      </>
    );
  }

  // 2. Multiple Churches - Configuration Error State
  if (state.status === "multiple") {
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <AdminPageHeader
          title="Church Settings"
          description="Configuration error: multiple church records found in the database."
        />

        <section className="space-y-3">
          <div className="px-1">
            <h2 className="text-destructive text-base font-semibold">
              Configuration error: {state.count} churches detected
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              The administration application supports exactly one active church.
              Mutations are locked until records are consolidated.
            </p>
          </div>
          <div className="admin-panel border-destructive/30 space-y-4 p-4 sm:p-6">
            <div className="admin-surface p-4">
              <h3 className="text-foreground mb-3 text-sm font-semibold">
                Existing church records (read-only):
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-muted-foreground border-border border-b text-xs uppercase">
                    <tr>
                      <th className="pb-2 font-medium">Church name</th>
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
          </div>
        </section>
      </div>
    );
  }

  // 3. One Church - Standard Active State
  const { church } = state;

  return (
    <>
      {successToast && (
        <StatusToast
          key={successToast.id}
          message={successToast.message}
          onDismiss={dismissSuccessToast}
        />
      )}
      <div className="mx-auto max-w-4xl space-y-8">
        <AdminPageHeader
          title="Church Settings"
          description="Operational details and configuration for the active church profile."
        />

        <section>
          <ExpandableCoordinatorProvider>
            <ExpandableActionItem
              id="church-profile"
              name={church.name}
              onEdit={() => setEditOpen(true)}
              editLabel="Edit church"
              onAdditionalAction={() => router.push("/admin/church/advanced")}
              additionalActionLabel="Advanced settings"
              additionalActionIcon={Settings2}
              className="p-4 sm:p-5 md:grid md:grid-cols-[1fr_44px] md:items-center md:gap-4 md:p-3"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <Link
                  href="/admin/ministries"
                  className="group/item flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <Building2 className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    {/* User-entered database value displayed verbatim */}
                    <p className="text-foreground truncate font-semibold group-hover/item:underline">
                      {church.name}
                    </p>
                    <span className="text-muted-foreground flex items-center gap-1 font-mono text-xs">
                      <Globe className="size-3.5" aria-hidden="true" />
                      <span>/{church.slug}</span>
                    </span>
                  </div>
                </Link>
                <ExpandableActionItem.Trigger className="md:hidden" />
              </div>
              <ChurchProfileActions
                onEdit={() => setEditOpen(true)}
                onAdvancedSettings={() => router.push("/admin/church/advanced")}
              />
              <div className="hidden justify-end md:flex">
                <ExpandableActionItem.DesktopActions />
              </div>
            </ExpandableActionItem>
          </ExpandableCoordinatorProvider>
        </section>
      </div>

      <EditChurchDialog
        church={church}
        onSuccess={handleActionSuccess}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

function ChurchProfileActions({
  onEdit,
  onAdvancedSettings,
}: {
  onEdit: () => void;
  onAdvancedSettings: () => void;
}) {
  const { id, name, isOpen } = useExpandableItem();
  const { closeAll } = useExpandableCoordinator();

  return (
    <ExpandableCardPanel
      open={isOpen}
      id={`actions-panel-${id}`}
      label={`Actions for ${name}`}
      className="md:hidden"
    >
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            closeAll();
            onAdvancedSettings();
          }}
          className="min-h-11 w-full gap-2 text-sm font-semibold"
        >
          <Settings2 className="size-4" aria-hidden="true" />
          <span>Advanced settings</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            closeAll();
            onEdit();
          }}
          className="min-h-11 w-full gap-2 text-sm font-semibold"
        >
          <Pencil className="size-4" aria-hidden="true" />
          <span>Edit church</span>
        </Button>
      </div>
    </ExpandableCardPanel>
  );
}
