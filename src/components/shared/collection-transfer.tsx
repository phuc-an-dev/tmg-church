"use client";

import * as React from "react";
import { Check, Upload } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/**
 * Shared import/export engine for collection "Manage" drawers: file parsing,
 * merge/replace import panel, export panel, and download helpers.
 */

export type TransferColumn = {
  key: string;
  label: string;
  aliases?: string[];
  required?: boolean;
  /** Normalize a raw cell before validation (e.g. lowercase icon keys). */
  transform?: (value: string) => string;
  /** Return false to move the row to the skipped list. */
  validate?: (value: string) => boolean;
};

export type ParsedTransfer = {
  valid: Record<string, string>[];
  skipped: string[];
};

export function parseTransferInput(
  raw: string,
  columns: TransferColumn[],
  preserveDuplicates = false,
): ParsedTransfer {
  const trimmed = raw.trim();
  if (!trimmed) return { valid: [], skipped: [] };

  const primaryColumn = columns.find((column) => column.required) ?? columns[0];
  const valid: Record<string, string>[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();

  const accept = (values: Record<string, string>, displayLabel: string) => {
    const row: Record<string, string> = {};
    for (const column of columns) {
      const rawValue = (values[column.key] ?? "").trim();
      if (!rawValue) {
        if (column.required) {
          skipped.push(displayLabel);
          return;
        }
        continue;
      }
      const value = column.transform ? column.transform(rawValue) : rawValue;
      if (column.validate && !column.validate(value)) {
        skipped.push(displayLabel);
        return;
      }
      row[column.key] = value;
    }
    const key = JSON.stringify(row);
    if (!preserveDuplicates && seen.has(key)) return;
    seen.add(key);
    valid.push(row);
  };

  let items: unknown[] | null = null;
  try {
    const parsedJson: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsedJson)) {
      items = parsedJson;
    } else if (parsedJson && typeof parsedJson === "object") {
      const firstArray = Object.values(parsedJson).find((value) =>
        Array.isArray(value),
      );
      if (Array.isArray(firstArray)) items = firstArray;
    }
  } catch {
    items = null;
  }

  if (items) {
    for (const item of items) {
      if (typeof item === "string") {
        accept({ [primaryColumn.key]: item }, item);
        continue;
      }
      if (item && typeof item === "object") {
        const values: Record<string, string> = {};
        for (const [key, value] of Object.entries(
          item as Record<string, unknown>,
        )) {
          const column = matchColumn(key, columns);
          if (
            column &&
            (typeof value === "string" || typeof value === "number")
          ) {
            values[column.key] = String(value);
          }
        }
        const displayLabel = String(
          (item as Record<string, unknown>)[primaryColumn.key] ??
            "Untitled row",
        );
        accept(values, displayLabel);
      } else {
        skipped.push("Unsupported entry");
      }
    }
    return { valid, skipped };
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headerCells = splitDelimitedLine(lines[0]);
  const headerColumns = headerCells.map((cell) => matchColumn(cell, columns));
  const matchedHeaders = headerColumns.filter(Boolean).length;
  const hasHeader =
    matchedHeaders >= Math.min(2, columns.length) ||
    (headerCells.length === 1 && matchedHeaders === 1);
  const rows = hasHeader ? lines.slice(1) : lines;

  for (const line of rows) {
    const cells = splitDelimitedLine(line);
    const values: Record<string, string> = {};
    if (hasHeader) {
      headerCells.forEach((_, index) => {
        const column = headerColumns[index];
        if (column && cells[index]) values[column.key] = cells[index];
      });
    } else if (columns.length === 1 || cells.length === 1) {
      values[primaryColumn.key] = cells[0] ?? "";
    } else {
      columns.forEach((column, index) => {
        if (cells[index]) values[column.key] = cells[index];
      });
    }
    const displayLabel = (values[primaryColumn.key] || line).slice(0, 80);
    accept(values, displayLabel);
  }

  return { valid, skipped };
}

function splitDelimitedLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === "," || char === ";" || char === "\t") && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function matchColumn(
  cell: string,
  columns: TransferColumn[],
): TransferColumn | null {
  const normalized = normalizeHeader(cell);
  return (
    columns.find(
      (column) =>
        normalizeHeader(column.key) === normalized ||
        (column.aliases ?? []).some(
          (alias) => normalizeHeader(alias) === normalized,
        ),
    ) ?? null
  );
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** File picking, parsing, and merge/replace mode state for an import panel. */
export function useCollectionImport(columns: TransferColumn[]) {
  const [importMode, setImportMode] = React.useState<"merge" | "replace">(
    "merge",
  );
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [parsed, setParsed] = React.useState<ParsedTransfer>({
    valid: [],
    skipped: [],
  });

  const handleFileSelect = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        setParsed(
          parseTransferInput((e.target?.result as string) ?? "", columns),
        );
      };
      reader.readAsText(file);
      event.target.value = "";
    },
    [columns],
  );

  const resetImport = React.useCallback(() => {
    setFileName(null);
    setParsed({ valid: [], skipped: [] });
  }, []);

  return {
    importMode,
    setImportMode,
    fileName,
    parsed,
    handleFileSelect,
    resetImport,
  };
}

export interface ImportPanelProps {
  entityLabel: string;
  chipField: string;
  fileInputId: string;
  importMode: "merge" | "replace";
  onImportModeChange: (mode: "merge" | "replace") => void;
  fileName: string | null;
  parsed: ParsedTransfer;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  replaceLabel?: string;
  allowReplace?: boolean;
  renderChip?: (row: Record<string, string>) => React.ReactNode;
}

export function ImportPanel({
  entityLabel,
  chipField,
  fileInputId,
  importMode,
  onImportModeChange,
  fileName,
  parsed,
  onFileSelect,
  replaceLabel,
  allowReplace = true,
  renderChip,
}: ImportPanelProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const resolvedReplaceLabel =
    replaceLabel ?? `Replace all existing ${entityLabel}`;

  return (
    <div className="space-y-7">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv,.txt"
        onChange={onFileSelect}
        className="hidden"
        id={fileInputId}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Strategy Selection with Switch */}
      {allowReplace && (
        <div className="space-y-2">
          <Label
            htmlFor={`${fileInputId}-replace-mode-switch`}
            className="text-foreground text-sm font-medium"
          >
            Import Strategy
          </Label>
          <label
            htmlFor={`${fileInputId}-replace-mode-switch`}
            className={cn(
              "flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 transition-colors",
              importMode === "replace"
                ? "border-destructive/40 bg-destructive/5"
                : "border-border/80 bg-card hover:bg-muted/30",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-semibold">
                {resolvedReplaceLabel}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs leading-normal">
                {importMode === "replace"
                  ? `Clear current ${entityLabel} and replace with imported rows.`
                  : `Keep existing ${entityLabel} and append new ones.`}
              </p>
            </div>
            <Switch
              id={`${fileInputId}-replace-mode-switch`}
              checked={importMode === "replace"}
              onCheckedChange={(checked) =>
                onImportModeChange(checked ? "replace" : "merge")
              }
              aria-label={resolvedReplaceLabel}
            />
          </label>
          {importMode === "replace" && (
            <p className="text-destructive text-xs leading-normal">
              Warning: This will delete all currently saved {entityLabel} and
              replace them with the imported list.
            </p>
          )}
        </div>
      )}

      {/* File Upload Only */}
      <div className="space-y-2">
        <Label
          htmlFor={`${fileInputId}-button`}
          className="text-foreground text-sm font-medium"
        >
          Source Data
        </Label>
        <Button
          id={`${fileInputId}-button`}
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="border-border/80 bg-card hover:bg-muted/40 text-foreground min-h-12 w-full gap-2.5 rounded-2xl text-sm font-semibold shadow-xs"
        >
          <Upload className="size-4" aria-hidden="true" />
          <span>
            {fileName
              ? `Change file (${fileName})`
              : "Choose File (.json, .csv)"}
          </span>
        </Button>
        {fileName && (
          <p className="text-muted-foreground font-mono text-xs">
            Loaded file: {fileName}
          </p>
        )}
      </div>

      {/* Parsed summary & preview */}
      {parsed.valid.length > 0 && (
        <div className="bg-muted/30 space-y-2 rounded-xl border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {parsed.valid.length} valid {entityLabel} detected
            </span>
            {parsed.skipped.length > 0 && (
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                {parsed.skipped.length} invalid skipped
              </span>
            )}
          </div>

          <div className="mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto pt-1">
            {parsed.valid.map((row, index) => (
              <span
                key={`${row[chipField] ?? "row"}-${index}`}
                className="bg-card text-foreground inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs"
              >
                {renderChip ? (
                  renderChip(row)
                ) : (
                  <span className="max-w-40 truncate">{row[chipField]}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ExportPanel({
  fields,
  selectedFields,
  onSelectedFieldsChange,
  disabled = false,
}: {
  fields: Array<{ key: string; label: string }>;
  selectedFields: string[];
  onSelectedFieldsChange: (fields: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-xl border p-4">
        <p className="text-base font-medium">CSV (Excel)</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Select the fields to include in your CSV file.
        </p>
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-base font-medium">Export fields</legend>
        {fields.map((field) => {
          const selected = selectedFields.includes(field.key);
          return (
            <button
              key={field.key}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              className={cn(
                "hover:bg-muted/60 flex min-h-14 w-full items-center justify-between rounded-xl border p-3.5 text-left text-base transition-colors disabled:opacity-50",
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border/70 bg-card",
              )}
              onClick={() =>
                onSelectedFieldsChange(
                  selected
                    ? selectedFields.filter((key) => key !== field.key)
                    : [...selectedFields, field.key],
                )
              }
            >
              <span className="text-foreground text-base font-normal">
                {field.label}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "ml-3 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40 bg-transparent",
                )}
              >
                {selected && <Check className="size-3.5 stroke-3" />}
              </span>
            </button>
          );
        })}
        {!selectedFields.length && (
          <p role="status" className="text-muted-foreground text-sm">
            Select at least one field to export.
          </p>
        )}
      </fieldset>
    </div>
  );
}

export function CsvExportFooter({
  onCancel,
  onExport,
  disabled = false,
  pending = false,
}: {
  onCancel: () => void;
  onExport: () => void;
  disabled?: boolean;
  pending?: boolean;
}) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={pending}
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button
        type="button"
        className="min-h-11"
        disabled={disabled || pending}
        onClick={onExport}
      >
        {pending ? "Exporting..." : "Export CSV"}
      </Button>
    </>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function datedFileName(baseName: string, extension: string) {
  return `${baseName}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

export function downloadCsvFile(
  baseName: string,
  headers: string[],
  rows: string[][],
  selectedHeaders = headers,
) {
  const escape = (value: string) =>
    /[",;\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  const indexes = headers.flatMap((header, index) =>
    selectedHeaders.includes(header) ? [index] : [],
  );
  if (!indexes.length) return;
  const content = [
    indexes.map((index) => escape(headers[index])).join(","),
    ...rows.map((row) =>
      indexes.map((index) => escape(row[index] ?? "")).join(","),
    ),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, datedFileName(baseName, "csv"));
}
