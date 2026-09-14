"use client";

import * as React from "react";
import { cn } from "cn";
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from "react-day-picker";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from "lucide-react";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
  dropdownMaxHeight?: string;
};

export interface CalendarDropdownProps {
  options?: Array<{ value: number; label: string; disabled?: boolean }>;
  value?: number | string | readonly string[];
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  disabled?: boolean;
  dropdownMaxHeight?: string;
  "aria-label"?: string;
  className?: string;
}

function CalendarDropdown({
  options,
  value,
  onChange,
  disabled,
  dropdownMaxHeight = "max-h-56",
  "aria-label": ariaLabel,
}: CalendarDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const stringValue = Array.isArray(value)
    ? String(value[0] ?? "")
    : String(value ?? "");
  const selectedOption = options?.find(
    (opt) => String(opt.value) === stringValue,
  );

  // Close on outside pointer click or Escape
  React.useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Scroll the selected option into view when opened
  React.useEffect(() => {
    if (open && listRef.current) {
      const selectedEl = listRef.current.querySelector<HTMLElement>(
        '[data-selected="true"]',
      );
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [open]);

  // Prevent parent modal scroll-lock from intercepting wheel and touch gestures
  React.useEffect(() => {
    const listEl = listRef.current;
    if (!open || !listEl) return;

    function handleScrollStop(e: Event) {
      e.stopPropagation();
    }

    listEl.addEventListener("wheel", handleScrollStop, { passive: false });
    listEl.addEventListener("touchmove", handleScrollStop, { passive: false });

    return () => {
      listEl.removeEventListener("wheel", handleScrollStop);
      listEl.removeEventListener("touchmove", handleScrollStop);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="hover:bg-muted/80 h-8 gap-1 rounded-md px-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-hidden"
      >
        <span>{selectedOption?.label ?? stringValue}</span>
        <ChevronDownIcon
          className={cn(
            "text-muted-foreground size-3.5 opacity-70 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </Button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          className={cn(
            "border-border bg-popover text-popover-foreground ring-foreground/10 absolute top-full left-1/2 z-50 mt-1 flex -translate-x-1/2 touch-pan-y flex-col gap-0.5 overflow-x-hidden overflow-y-auto overscroll-contain rounded-lg border p-1 shadow-lg ring-1 outline-none [-webkit-overflow-scrolling:touch]",
            "w-max max-w-[10rem] min-w-[6rem]",
            dropdownMaxHeight,
          )}
        >
          {options?.map((option) => {
            const isSelected = String(option.value) === stringValue;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-selected={isSelected}
                disabled={option.disabled}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const num = Number(option.value);
                  onChange?.({
                    target: { value: isNaN(num) ? option.value : num },
                  } as unknown as React.ChangeEvent<HTMLSelectElement>);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className={cn(
                  "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground relative flex w-full cursor-pointer items-center justify-between rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors select-none focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
                  isSelected &&
                    "bg-accent/80 text-accent-foreground font-semibold",
                )}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <CheckIcon
                    className="text-primary ml-1.5 size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "dropdown",
  buttonVariant = "ghost",
  dropdownMaxHeight = "max-h-56",
  locale,
  formatters,
  components,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-background p-2 [--cell-radius:var(--radius-md)] [--cell-size:2.25rem] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months,
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-8",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "relative inline-flex items-center rounded-md",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          "absolute inset-0 z-10 w-full h-full cursor-pointer opacity-0",
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          "font-medium select-none",
          captionLayout === "label"
            ? "text-sm"
            : "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-semibold hover:bg-muted/80 transition-colors [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label,
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none",
          defaultClassNames.weekday,
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          "text-[0.8rem] text-muted-foreground select-none",
          defaultClassNames.week_number,
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)"
            : "[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)",
          defaultClassNames.day,
        ),
        range_start: cn(
          "relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted",
          defaultClassNames.range_start,
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn(
          "relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted",
          defaultClassNames.range_end,
        ),
        today: cn(
          "rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-none",
          defaultClassNames.today,
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Dropdown: (dropdownProps) => (
          <CalendarDropdown
            {...dropdownProps}
            dropdownMaxHeight={dropdownMaxHeight}
          />
        ),
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            );
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          );
        },
        DayButton: ({ ...props }) => (
          <CalendarDayButton locale={locale} {...props} />
        ),
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-foreground relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton, CalendarDropdown };
