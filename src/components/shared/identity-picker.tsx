"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Info, Plus } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DynamicLucideIcon } from "@/features/ministry/components/dynamic-lucide-icon";
import {
  DEFAULT_MINISTRY_COLOR,
  MINISTRY_COLOR_OPTIONS,
  isMinistryIconKey,
  ministryIconFor,
  ministryIconLabel,
  normalizeMinistryColor,
} from "@/features/ministry/visual-identity";
import type { FrequentIconItem } from "@/features/icon/types";

export function IdentityIcon({
  iconKey,
  className,
}: {
  iconKey: string;
  className: string;
}) {
  if (!isMinistryIconKey(iconKey)) {
    return <DynamicLucideIcon iconKey={iconKey} className={className} />;
  }

  const Icon = ministryIconFor(iconKey);
  return React.createElement(Icon, { className, "aria-hidden": true });
}

export function IdentityTile({
  accentColor,
  iconKey,
  className = "size-10 rounded-xl",
  iconClassName = "size-5",
}: {
  accentColor: string;
  iconKey: string;
  className?: string;
  iconClassName?: string;
}) {
  const color = normalizeMinistryColor(accentColor);
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center border",
        className,
      )}
      style={{
        borderColor: `color-mix(in srgb, ${color} 34%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
      }}
    >
      <IdentityIcon iconKey={iconKey} className={iconClassName} />
    </span>
  );
}

export interface IdentityPickerProps {
  entityLabel: string;
  accentColor: string;
  iconKey: string;
  customColorOpen: boolean;
  colorError: string | null;
  previewName: string;
  frequentIcons?: FrequentIconItem[];
  onAccentColorChange: (value: string) => void;
  onIconKeyChange: (value: string) => void;
  onCustomColorOpenChange: (value: boolean) => void;
}

export function IdentityPicker({
  entityLabel,
  accentColor,
  iconKey,
  customColorOpen,
  colorError,
  previewName,
  frequentIcons = [],
  onAccentColorChange,
  onIconKeyChange,
  onCustomColorOpenChange,
}: IdentityPickerProps) {
  const normalizedColor = normalizeMinistryColor(accentColor);
  const activeIconLabel = ministryIconLabel(iconKey);
  const customColorSelected = !MINISTRY_COLOR_OPTIONS.some(
    (option) => option.value === normalizedColor,
  );
  const iconContainerRef = React.useRef<HTMLDivElement>(null);

  const iconList = React.useMemo(() => {
    const list = [...frequentIcons];
    if (iconKey && !list.some((item) => item.name === iconKey)) {
      list.unshift({
        id: `current-${iconKey}`,
        name: iconKey,
        displayOrder: -1,
      });
    }
    return list;
  }, [frequentIcons, iconKey]);

  function selectColor(index: number) {
    if (index === MINISTRY_COLOR_OPTIONS.length) {
      onCustomColorOpenChange(true);
      return;
    }
    onAccentColorChange(MINISTRY_COLOR_OPTIONS[index].value);
    onCustomColorOpenChange(false);
  }

  function moveColorFocus(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowDown" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowUp"
    ) {
      return;
    }

    event.preventDefault();
    const total = MINISTRY_COLOR_OPTIONS.length + 1;
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (index + delta + total) % total;
    selectColor(nextIndex);

    const controls = (
      event.currentTarget.parentElement as HTMLElement | null
    )?.querySelectorAll<HTMLButtonElement>('button[role="radio"]');
    controls?.[nextIndex]?.focus();
  }

  function moveIconFocus(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowDown" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowUp"
    ) {
      return;
    }

    event.preventDefault();
    const total = iconList.length;
    if (total === 0) return;

    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (index + delta + total) % total;
    onIconKeyChange(iconList[nextIndex].name);

    const buttons =
      iconContainerRef.current?.querySelectorAll<HTMLButtonElement>(
        'button[role="radio"]',
      );
    buttons?.[nextIndex]?.focus();
  }

  return (
    <div className="space-y-4">
      {/* Color Selection */}
      <div className="space-y-2">
        <Label>{entityLabel} color</Label>
        <div
          className="flex flex-wrap items-center gap-2"
          role="radiogroup"
          aria-label={`${entityLabel} color options`}
        >
          {MINISTRY_COLOR_OPTIONS.map((option) => {
            const selected = normalizedColor === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={option.label}
                onClick={() => {
                  selectColor(MINISTRY_COLOR_OPTIONS.indexOf(option));
                }}
                onKeyDown={(event) =>
                  moveColorFocus(event, MINISTRY_COLOR_OPTIONS.indexOf(option))
                }
                className="focus-visible:outline-primary flex size-11 min-h-11 min-w-11 items-center justify-center rounded-full border-2 border-transparent transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  backgroundColor: option.value,
                  borderColor: selected ? "var(--foreground)" : "transparent",
                }}
              >
                {selected && (
                  <Check
                    className="size-4 text-white"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
          <button
            type="button"
            role="radio"
            aria-checked={customColorSelected}
            aria-label="Custom color"
            title="Custom color"
            onClick={() => onCustomColorOpenChange(!customColorOpen)}
            onKeyDown={(event) =>
              moveColorFocus(event, MINISTRY_COLOR_OPTIONS.length)
            }
            className={cn(
              "focus-visible:outline-primary relative flex size-11 min-h-11 min-w-11 items-center justify-center rounded-full border-2 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2",
              customColorSelected ? "border-foreground" : "border-transparent",
            )}
            style={
              customColorSelected
                ? {
                    backgroundColor: normalizedColor,
                    borderColor: "var(--foreground)",
                  }
                : {
                    background:
                      "conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)",
                  }
            }
          >
            {customColorSelected ? (
              <Check
                className="size-4 text-white"
                strokeWidth={3}
                aria-hidden="true"
              />
            ) : (
              <span className="bg-background/85 text-foreground flex size-6 items-center justify-center rounded-full shadow-xs backdrop-blur-xs">
                <Plus
                  className="size-3.5"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              </span>
            )}
          </button>
        </div>
        {customColorOpen && (
          <div className="space-y-1.5 pt-1">
            <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-2">
              <Input
                type="color"
                aria-label={`Choose custom ${entityLabel.toLowerCase()} color`}
                value={normalizedColor}
                onChange={(event) => onAccentColorChange(event.target.value)}
                className="h-11 w-12 p-1"
              />
              <Input
                value={accentColor}
                onChange={(event) =>
                  onAccentColorChange(event.target.value.toLowerCase())
                }
                aria-invalid={Boolean(colorError)}
                aria-describedby={colorError ? "custom-color-error" : undefined}
                aria-label={`Custom ${entityLabel.toLowerCase()} color hex value`}
                placeholder={DEFAULT_MINISTRY_COLOR}
                className="h-11 font-mono text-base"
                pattern="^#[0-9a-fA-F]{6}$"
              />
            </div>
            {colorError && (
              <p id="custom-color-error" className="text-destructive text-sm">
                {colorError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Icon Selection */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label>{entityLabel} icon</Label>
          <p className="text-muted-foreground text-xs">
            Selected:{" "}
            <span className="text-foreground font-medium">
              {activeIconLabel}
            </span>
          </p>
        </div>

        {frequentIcons.length === 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            <Info className="size-4 shrink-0" aria-hidden="true" />
            <span>
              No icons configured yet. Configure icons in{" "}
              <Link
                href="/admin/icons"
                className="font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
              >
                /admin/icons
              </Link>
              .
            </span>
          </div>
        )}

        {iconList.length > 0 && (
          <div
            ref={iconContainerRef}
            role="radiogroup"
            aria-label={`${entityLabel} icon options`}
            className="grid max-h-[16.75rem] grid-cols-6 gap-2 overflow-y-auto rounded-xl border p-2.5 sm:grid-cols-7 md:grid-cols-8"
          >
            {iconList.map((icon, index) => {
              const isSelected = icon.name === iconKey;
              const isCurrentFallback = icon.displayOrder === -1;
              const label = ministryIconLabel(icon.name);
              const accessibleLabel = isCurrentFallback
                ? `${label} (Current)`
                : label;

              return (
                <button
                  key={icon.name}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={accessibleLabel}
                  title={accessibleLabel}
                  onClick={() => onIconKeyChange(icon.name)}
                  onKeyDown={(event) => moveIconFocus(event, index)}
                  className={cn(
                    "focus-visible:outline-primary relative flex aspect-square min-h-11 w-full items-center justify-center rounded-xl border transition-all hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary ring-primary/30 shadow-xs ring-2"
                      : "border-border/70 bg-muted/20 text-muted-foreground hover:border-foreground/30 hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  <IdentityIcon iconKey={icon.name} className="size-5" />
                  {isCurrentFallback && (
                    <span
                      className="ring-background absolute -top-1 -right-1 flex size-2.5 rounded-full bg-amber-500 ring-2"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Visual Identity Preview */}
      <div
        className="flex items-center gap-3 rounded-xl border p-3"
        style={{ borderLeftColor: normalizedColor, borderLeftWidth: 3 }}
        aria-label={`${entityLabel} identity preview`}
      >
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            color: normalizedColor,
            backgroundColor: `color-mix(in srgb, ${normalizedColor} 12%, transparent)`,
          }}
        >
          <IdentityIcon iconKey={iconKey} className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="text-muted-foreground block text-xs font-medium">
            Preview
          </span>
          <span className="block truncate font-semibold">{previewName}</span>
        </span>
      </div>
    </div>
  );
}
