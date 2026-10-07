"use client";

import * as React from "react";
import { Download, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManageCollectionDrawer } from "@/components/shared/manage-collection-drawer";
import { MemberAssignDrawer } from "@/components/shared/member-assign-drawer";
import {
  ExportPanel,
  CsvExportFooter,
  ImportPanel,
  downloadCsvFile,
  parseTransferInput,
  type TransferColumn,
  type ParsedTransfer,
} from "@/components/shared/collection-transfer";
import {
  exportTermMembersAction,
  previewTermMemberImportAction,
} from "../term-member-transfer-actions";
import type { EligibleTermMember } from "../types";

const columns: TransferColumn[] = [
  { key: "member_id", label: "Member ID", aliases: ["memberId", "id"] },
  { key: "email", label: "Email", aliases: ["email_address"] },
];
const csvHeaders = ["member_id", "name", "email", "group", "departments"];
const exportLabels = ["Member ID", "Name", "Email", "Group", "Departments"];
type PreviewRows = Extract<
  Awaited<ReturnType<typeof previewTermMemberImportAction>>,
  { success: true }
>["rows"];

export function TermMemberManagementDrawer({
  open,
  onOpenChange,
  termId,
  members,
  onAdd,
  pending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termId: string;
  members: EligibleTermMember[];
  onAdd: (ids: string[]) => Promise<void>;
  pending: boolean;
  error: string | null;
}) {
  const [tab, setTab] = React.useState<"add" | "import" | "export">("add");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [exportFields, setExportFields] = React.useState(csvHeaders);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [parsed, setParsed] = React.useState<ParsedTransfer>({
    valid: [],
    skipped: [],
  });
  const [preview, setPreview] = React.useState<PreviewRows>([]);
  const [transferPending, setTransferPending] = React.useState(false);
  const [transferError, setTransferError] = React.useState<string | null>(null);
  const requestId = React.useRef(0);
  const busy = pending || transferPending;
  const importIds = preview.flatMap((row) =>
    row.status === "ready" && row.memberId ? [row.memberId] : [],
  );

  async function selectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) return;
    const request = ++requestId.current;
    setFileName(file.name);
    setPreview([]);
    setParsed({ valid: [], skipped: [] });
    setTransferError(null);
    setTransferPending(true);
    try {
      const result = parseTransferInput(await file.text(), columns, true);
      if (!result.valid.length) {
        setTransferError(
          "No member IDs or email addresses found in this file.",
        );
        return;
      }
      const response = await previewTermMemberImportAction({
        termId,
        rows: result.valid,
      });
      if (request !== requestId.current) return;
      if (!response.success) {
        setTransferError(response.error);
        return;
      }
      setPreview(response.rows);
      setParsed({
        valid: response.rows
          .filter((row) => row.status === "ready")
          .map((row) => ({ email: row.label })),
        skipped: response.rows
          .filter((row) => row.status !== "ready")
          .map((row) => row.reason),
      });
    } catch {
      setTransferError("Unable to read or validate this file.");
    } finally {
      if (request === requestId.current) setTransferPending(false);
    }
  }

  async function exportMembers() {
    if (busy || !exportFields.length) return;
    setTransferPending(true);
    setTransferError(null);
    try {
      const result = await exportTermMembersAction({ termId });
      if (!result.success) {
        setTransferError(result.error);
        return;
      }
      downloadCsvFile(
        "ministry-term-members",
        csvHeaders,
        result.rows,
        exportFields,
      );
    } catch {
      setTransferError("Unable to export members.");
    } finally {
      setTransferPending(false);
    }
  }

  return (
    <ManageCollectionDrawer
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
      title="Manage members"
      description="Manage members enrolled in this ministry term."
      mobileMinHeightClass="min-h-[85dvh]"
      tabs={[
        { key: "add", label: "Add", icon: Plus },
        { key: "import", label: "Import", icon: Upload },
        { key: "export", label: "Export", icon: Download },
      ]}
      activeTab={tab}
      onTabChange={(next) => {
        if (!busy) {
          setTab(next);
          setTransferError(null);
        }
      }}
      footer={
        tab === "export" ? (
          <CsvExportFooter
            onCancel={() => onOpenChange(false)}
            onExport={() => void exportMembers()}
            pending={busy}
            disabled={!exportFields.length}
          />
        ) : (
          <>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="min-h-11"
              disabled={
                busy ||
                (tab === "add" ? !selectedIds.length : !importIds.length)
              }
              onClick={() =>
                void onAdd(tab === "add" ? selectedIds : importIds)
              }
            >
              {busy
                ? "Processing..."
                : `${tab === "add" ? "Add members" : "Import"} (${tab === "add" ? selectedIds.length : importIds.length})`}
            </Button>
          </>
        )
      }
    >
      {(error || transferError) && (
        <p role="alert" className="text-destructive text-sm">
          {transferError ?? error}
        </p>
      )}
      {tab === "add" ? (
        <MemberAssignDrawer
          embedded
          open={open}
          onOpenChange={onOpenChange}
          title="Add members"
          searchPlaceholder="Search unassigned members..."
          members={members.map((member) => ({
            id: member.id,
            name: member.name,
            gender: member.gender,
            subtitle: `/${member.slug}`,
          }))}
          onAssign={onAdd}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          pending={busy}
        />
      ) : tab === "import" ? (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Match existing church members by member ID or email. Already
            enrolled members and duplicate rows are skipped.
          </p>
          <Button
            variant="outline"
            className="min-h-11 w-full gap-2"
            onClick={() =>
              downloadCsvFile("ministry-members-template", csvHeaders, [])
            }
          >
            <Download className="size-4" aria-hidden="true" />
            Download CSV template
          </Button>
          <ImportPanel
            entityLabel="members"
            chipField="email"
            fileInputId="term-member-import"
            importMode="merge"
            onImportModeChange={() => {}}
            allowReplace={false}
            fileName={fileName}
            parsed={parsed}
            onFileSelect={(event) => void selectFile(event)}
          />
          {transferPending && (
            <p role="status" className="text-muted-foreground text-sm">
              Validating members...
            </p>
          )}
          {preview.length > 0 && (
            <div className="space-y-2" aria-label="Import preview">
              {preview.map((row) => (
                <div
                  key={row.row}
                  className="bg-card flex min-h-14 flex-col justify-center rounded-xl border px-3 py-2"
                >
                  <p className="text-sm font-medium">
                    Row {row.row}: {row.label}
                  </p>
                  <p
                    className={
                      row.status === "ready"
                        ? "text-muted-foreground text-xs"
                        : row.status === "invalid"
                          ? "text-destructive text-xs"
                          : "text-muted-foreground text-xs"
                    }
                  >
                    {row.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <ExportPanel
          fields={csvHeaders.map((key, index) => ({
            key,
            label: exportLabels[index],
          }))}
          selectedFields={exportFields}
          onSelectedFieldsChange={setExportFields}
          disabled={busy}
        />
      )}
    </ManageCollectionDrawer>
  );
}
