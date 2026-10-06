"use client";

import * as React from "react";
import { cn } from "cn";
import {
  DayPicker,
  getDefaultClassNames,
  useDayPicker,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsDesktop } from "@/components/shared/responsive-editor";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
  dropdownMaxHeight?: string;
  transparent?: boolean;
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

const MonthYearContext = React.createContext<{
  isDesktop: boolean | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  registerDropdown: (
    type: "month" | "year",
    props: CalendarDropdownProps,
  ) => void;
  registerGoToMonth: (fn: (date: Date) => void) => void;
  monthProps: CalendarDropdownProps | null;
  yearProps: CalendarDropdownProps | null;
}>({
  isDesktop: true,
  open: false,
  setOpen: () => {},
  registerDropdown: () => {},
  registerGoToMonth: () => {},
  monthProps: null,
  yearProps: null,
});

function CalendarDropdownNav({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { isDesktop, setOpen, registerGoToMonth, monthProps, yearProps } =
    React.useContext(MonthYearContext);
  const { goToMonth } = useDayPicker();

  React.useEffect(() => {
    registerGoToMonth(goToMonth);
  }, [registerGoToMonth, goToMonth]);

  const monthLabel =
    monthProps?.options?.find(
      (opt) => String(opt.value) === String(monthProps.value),
    )?.label ?? "";
  const yearLabel =
    yearProps?.options?.find(
      (opt) => String(opt.value) === String(yearProps.value),
    )?.label ?? (yearProps?.value ? String(yearProps.value) : "");

  return (
    <div className={className} {...props}>
      {isDesktop === false ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(true);
            }}
            aria-label="Select month and year"
            className="hover:bg-muted/80 text-foreground relative z-30 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold transition-colors"
          >
            <span>
              {monthLabel} {yearLabel}
            </span>
          </button>
          <div className="hidden" aria-hidden="true">
            {children}
          </div>
        </>
      ) : (
        children
      )}
    </div>
  );
}

function isSameOptions(
  a?: Array<{ value: number; label: string }>,
  b?: Array<{ value: number; label: string }>,
) {
  if (a === b) return true;
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  return (
    a[0]?.value === b[0]?.value &&
    a[a.length - 1]?.value === b[b.length - 1]?.value
  );
}

function CalendarDropdown({
  options,
  value,
  onChange,
  disabled,
  dropdownMaxHeight = "max-h-56",
  "aria-label": ariaLabel,
}: CalendarDropdownProps) {
  const {
    isDesktop,
    setOpen: setDrawerOpen,
    registerDropdown,
  } = React.useContext(MonthYearContext);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const isMonth =
    Boolean(ariaLabel?.toLowerCase().includes("month")) ||
    (options && options.length === 12 && options[0]?.value === 0);
  const dropdownType = isMonth ? "month" : "year";

  React.useEffect(() => {
    registerDropdown(dropdownType, {
      options,
      value,
      onChange,
      disabled,
      dropdownMaxHeight,
      "aria-label": ariaLabel,
    });
  }, [
    registerDropdown,
    dropdownType,
    value,
    options?.length,
    disabled,
    dropdownMaxHeight,
    ariaLabel,
  ]);

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
          if (isDesktop === false) {
            setDrawerOpen(true);
          } else {
            setOpen((prev) => !prev);
          }
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

      {open && isDesktop !== false && (
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
  transparent = false,
  locale,
  formatters,
  components,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();
  const isDesktop = useIsDesktop();
  const [open, setOpen] = React.useState(false);
  const [monthProps, setMonthProps] =
    React.useState<CalendarDropdownProps | null>(null);
  const [yearProps, setYearProps] =
    React.useState<CalendarDropdownProps | null>(null);
  const [draftMonthVal, setDraftMonthVal] = React.useState<
    number | string | readonly string[] | undefined
  >(undefined);
  const [draftYearVal, setDraftYearVal] = React.useState<
    number | string | readonly string[] | undefined
  >(undefined);
  const yearListRef = React.useRef<HTMLDivElement>(null);
  const monthPropsRef = React.useRef<CalendarDropdownProps | null>(null);
  const yearPropsRef = React.useRef<CalendarDropdownProps | null>(null);

  const goToMonthRef = React.useRef<((date: Date) => void) | null>(null);
  const registerGoToMonth = React.useCallback((fn: (date: Date) => void) => {
    goToMonthRef.current = fn;
  }, []);

  const registerDropdown = React.useCallback(
    (type: "month" | "year", p: CalendarDropdownProps) => {
      if (type === "month") {
        monthPropsRef.current = p;
        setMonthProps((prev) => {
          if (
            prev &&
            prev.value === p.value &&
            isSameOptions(prev.options, p.options)
          ) {
            return prev;
          }
          return p;
        });
      } else {
        yearPropsRef.current = p;
        setYearProps((prev) => {
          if (
            prev &&
            prev.value === p.value &&
            isSameOptions(prev.options, p.options)
          ) {
            return prev;
          }
          return p;
        });
      }
    },
    [],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftMonthVal(monthProps?.value);
      setDraftYearVal(yearProps?.value);
    }
    setOpen(nextOpen);
  };

  React.useEffect(() => {
    if (!open) return;
    const scrollInitialYear = () => {
      const container = yearListRef.current;
      if (!container) return;
      const initialYear = yearProps?.value ?? new Date().getFullYear();
      const targetEl =
        container.querySelector<HTMLElement>(`[data-year="${initialYear}"]`) ||
        container.querySelector<HTMLElement>('[data-selected="true"]');
      if (targetEl) {
        targetEl.scrollIntoView({
          block: "center",
          behavior: "instant" as ScrollBehavior,
        });
      }
    };
    const t1 = setTimeout(scrollInitialYear, 60);
    const t2 = setTimeout(scrollInitialYear, 180);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open, yearProps?.value]);

  return (
    <MonthYearContext.Provider
      value={{
        isDesktop,
        open,
        setOpen: handleOpenChange,
        registerDropdown,
        registerGoToMonth,
        monthProps,
        yearProps,
      }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className={cn(
            "w-full max-w-[26.25rem]",
            isDesktop === false &&
              !transparent &&
              "border-border/80 bg-card rounded-2xl border p-2 shadow",
          )}
        >
          <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn(
              "group/calendar bg-card w-full p-2 [--cell-radius:var(--radius-md)] [--cell-size:2.25rem] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent min-[400px]:[--cell-size:2.5rem] sm:[--cell-size:3rem]",
              transparent && "bg-transparent",
              isDesktop === false && !transparent && "p-0",
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
              root: cn("w-full", defaultClassNames.root),
              months: cn(
                "relative flex flex-col gap-4 md:flex-row",
                defaultClassNames.months,
              ),
              month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
              nav: cn(
                "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1 pointer-events-none z-10",
                defaultClassNames.nav,
              ),
              button_previous: cn(
                buttonVariants({ variant: buttonVariant }),
                "size-(--cell-size) min-h-[44px] min-w-[44px] p-0 select-none aria-disabled:opacity-50 pointer-events-auto cursor-pointer",
                defaultClassNames.button_previous,
              ),
              button_next: cn(
                buttonVariants({ variant: buttonVariant }),
                "size-(--cell-size) min-h-[44px] min-w-[44px] p-0 select-none aria-disabled:opacity-50 pointer-events-auto cursor-pointer",
                defaultClassNames.button_next,
              ),
              month_caption: cn(
                "flex min-h-(--cell-size) w-full items-center justify-center px-12 relative z-0",
                defaultClassNames.month_caption,
              ),
              dropdowns: cn(
                "flex min-h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium relative z-20 pointer-events-auto",
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
              month_grid: cn(
                "w-full flex flex-col",
                defaultClassNames.month_grid,
              ),
              weekdays: cn(
                "flex w-full mb-3 pb-2 border-b border-border/40",
                defaultClassNames.weekdays,
              ),
              weekday: cn(
                "flex-1 rounded-(--cell-radius) text-[0.85rem] font-semibold text-muted-foreground select-none text-center",
                defaultClassNames.weekday,
              ),
              weeks: cn(
                "flex flex-col gap-1.5 mt-2.5",
                defaultClassNames.weeks,
              ),
              week: cn("flex w-full", defaultClassNames.week),
              week_number_header: cn(
                "w-(--cell-size) select-none",
                defaultClassNames.week_number_header,
              ),
              week_number: cn(
                "text-[0.8rem] text-muted-foreground select-none",
                defaultClassNames.week_number,
              ),
              day: cn(
                "group/day relative flex aspect-square h-full w-full items-center justify-center rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)",
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
              today: cn("text-foreground", defaultClassNames.today),
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
              DropdownNav: (navProps) => <CalendarDropdownNav {...navProps} />,
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
                    <ChevronLeftIcon
                      className={cn("size-4", className)}
                      {...props}
                    />
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
                  <ChevronDownIcon
                    className={cn("size-4", className)}
                    {...props}
                  />
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
        </div>
      </div>
      {isDesktop === false && (
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent
            side="bottom"
            className="border-border/80 bg-card inset-x-0 bottom-0 z-[80] flex max-h-[85vh] flex-col rounded-t-2xl border-t p-0 shadow-2xl focus:outline-none"
          >
            <div
              className="bg-muted-foreground/30 mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full"
              aria-hidden="true"
            />
            <SheetHeader className="border-border/60 border-b px-5 pt-3 pb-3 text-left">
              <SheetTitle className="text-foreground text-lg font-bold">
                Select Month & Year
              </SheetTitle>
              <SheetDescription className="text-muted-foreground text-xs">
                Pick a month and year to navigate calendar.
              </SheetDescription>
            </SheetHeader>
            <div className="divide-border/60 flex max-h-[50vh] min-h-[300px] flex-1 divide-x overflow-hidden">
              {/* Left Column: Months */}
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="bg-muted/40 border-border/40 text-muted-foreground border-b px-3 py-2 text-[11px] font-bold tracking-wider uppercase">
                  Month
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-3">
                  {monthProps?.options?.map((option) => {
                    const isSelected =
                      String(option.value) === String(draftMonthVal);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setDraftMonthVal(option.value);
                        }}
                        className={cn(
                          "flex min-h-14 w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm font-medium transition-colors",
                          isSelected
                            ? "border-primary bg-primary/5 text-primary font-semibold"
                            : "border-border/60 hover:bg-muted/60 text-foreground",
                        )}
                      >
                        <span className="truncate">{option.label}</span>
                        {isSelected && (
                          <CheckIcon
                            className="text-primary size-4 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Years */}
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="bg-muted/40 border-border/40 text-muted-foreground border-b px-3 py-2 text-[11px] font-bold tracking-wider uppercase">
                  Year
                </div>
                <div
                  ref={yearListRef}
                  className="relative flex-1 space-y-2 overflow-y-auto p-3"
                >
                  {yearProps?.options?.map((option) => {
                    const isSelected =
                      String(option.value) === String(draftYearVal);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        data-selected={isSelected}
                        data-year={option.value}
                        onClick={() => {
                          setDraftYearVal(option.value);
                        }}
                        className={cn(
                          "flex min-h-14 w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm font-medium transition-colors",
                          isSelected
                            ? "border-primary bg-primary/5 text-primary font-semibold"
                            : "border-border/60 hover:bg-muted/60 text-foreground",
                        )}
                      >
                        <span className="truncate">{option.label}</span>
                        {isSelected && (
                          <CheckIcon
                            className="text-primary size-4 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom sticky footer with safe-area padding */}
            <div className="border-border/70 bg-muted/30 grid shrink-0 grid-cols-2 gap-3 border-t px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] [&>*]:w-full">
              <Button
                type="button"
                variant="outline"
                className="h-11 min-h-[44px] w-full text-base font-medium"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11 min-h-[44px] w-full text-base font-medium"
                onClick={() => {
                  const targetYear = Number(
                    draftYearVal !== undefined
                      ? draftYearVal
                      : (yearProps?.value ?? new Date().getFullYear()),
                  );
                  const targetMonth = Number(
                    draftMonthVal !== undefined
                      ? draftMonthVal
                      : (monthProps?.value ?? new Date().getMonth()),
                  );
                  const targetDate = new Date(targetYear, targetMonth, 1);

                  if (goToMonthRef.current) {
                    goToMonthRef.current(targetDate);
                  }
                  props.onMonthChange?.(targetDate);

                  setOpen(false);
                }}
              >
                Confirm
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </MonthYearContext.Provider>
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
      data-today={modifiers.today || undefined}
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
        "group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 data-[today=true]:not-data-[selected-single=true]:bg-muted data-[today=true]:not-data-[selected-single=true]:text-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-foreground relative isolate z-10 flex aspect-square size-(--cell-size) min-h-(--cell-size) min-w-(--cell-size) cursor-pointer touch-manipulation flex-col items-center justify-center gap-1 border-0 text-sm leading-none font-medium group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) data-[today=true]:rounded-(--cell-radius) [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

function CalendarSessionDayButton({
  count,
  children,
  ...props
}: React.ComponentProps<typeof CalendarDayButton> & { count: number }) {
  return (
    <CalendarDayButton
      {...props}
      className={
        count > 0
          ? "text-primary not-data-[selected-single=true]:bg-primary/10 not-data-[selected-single=true]:hover:bg-primary/15 data-[today=true]:not-data-[selected-single=true]:bg-primary/10 font-bold"
          : undefined
      }
    >
      <span>{children}</span>
      {count > 0 && (
        <span className="bg-primary ring-card absolute top-0 right-0 size-1.5 translate-x-1/2 -translate-y-1/2 rounded-full ring-2">
          <span className="sr-only">{count} sessions</span>
        </span>
      )}
    </CalendarDayButton>
  );
}

export {
  Calendar,
  CalendarDayButton,
  CalendarDropdown,
  CalendarSessionDayButton,
};
