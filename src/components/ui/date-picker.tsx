"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string) => void;
  min?: string | null;
  max?: string | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownMaxHeight?: string;
  startMonth?: Date;
  endMonth?: Date;
  dateFormat?: string;
  "aria-label"?: string;
}

function parseDate(value?: string | null): Date | undefined {
  if (!value || typeof value !== "string") return undefined;
  const parts = value.split("-");
  if (parts.length !== 3) return undefined;
  const [year, month, day] = parts.map(Number);
  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return undefined;
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
}

function formatDate(date?: Date): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DatePicker({
  id,
  name,
  value: controlledValue,
  defaultValue,
  onChange,
  min,
  max,
  placeholder = "Select date",
  disabled = false,
  className,
  dropdownMaxHeight = "max-h-56",
  startMonth,
  endMonth,
  dateFormat = "yyyy-MM-dd",
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState<string>(
    defaultValue ?? "",
  );
  const [open, setOpen] = React.useState(false);

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled
    ? (controlledValue ?? "")
    : uncontrolledValue;

  const selectedDate = React.useMemo(
    () => parseDate(currentValue),
    [currentValue],
  );

  const minDate = React.useMemo(() => parseDate(min), [min]);
  const maxDate = React.useMemo(() => parseDate(max), [max]);

  const [month, setMonth] = React.useState<Date>(
    () => selectedDate ?? minDate ?? new Date(),
  );

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setMonth(selectedDate ?? minDate ?? new Date());
    }
    setOpen(nextOpen);
  }

  function handleSelect(date?: Date) {
    const formatted = formatDate(date);
    if (!isControlled) {
      setUncontrolledValue(formatted);
    }
    onChange?.(formatted);
    setOpen(false);
  }

  function handleClear(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (!isControlled) {
      setUncontrolledValue("");
    }
    onChange?.("");
  }

  return (
    <div className={cn("relative flex w-full items-center", className)}>
      {name && (
        <input
          type="hidden"
          id={id}
          name={name}
          value={currentValue}
          disabled={disabled}
        />
      )}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={
              ariaLabel ??
              (selectedDate
                ? `Selected date: ${format(selectedDate, dateFormat)}`
                : placeholder)
            }
            className={cn(
              "bg-card hover:bg-card h-12 min-h-[44px] w-full justify-start px-3 text-left text-base font-normal sm:text-sm",
              selectedDate && !disabled ? "pr-12" : "",
              !selectedDate && "text-muted-foreground",
            )}
          >
            <CalendarIcon
              className="text-muted-foreground mr-2 size-4 shrink-0"
              aria-hidden="true"
            />
            <span className="truncate">
              {selectedDate ? format(selectedDate, dateFormat) : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="z-[60] w-auto p-0"
          align="start"
          sideOffset={6}
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            month={month}
            onMonthChange={setMonth}
            startMonth={startMonth ?? minDate ?? new Date(1950, 0)}
            endMonth={endMonth ?? maxDate ?? new Date(2050, 11)}
            captionLayout="dropdown"
            dropdownMaxHeight={dropdownMaxHeight}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
          />
        </PopoverContent>
      </Popover>
      {selectedDate && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear date"
          onClick={handleClear}
          className="text-muted-foreground hover:text-foreground hover:bg-muted absolute right-1 size-9 min-h-[36px] min-w-[36px] shrink-0 rounded-md"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
