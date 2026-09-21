"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NOT_PROVIDED_VALUE = "not-provided";
const GENDER_OPTIONS = [
  { value: NOT_PROVIDED_VALUE, gender: "", label: "Not provided" },
  { value: "female", gender: "female", label: "Female" },
  { value: "male", gender: "male", label: "Male" },
] as const;

export function GenderDropdown({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const activeLabel =
    GENDER_OPTIONS.find((option) => option.gender === value)?.label ??
    "Not provided";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={`Gender: ${activeLabel}`}
          className="bg-card hover:bg-card h-12 w-full justify-between px-3 text-base font-normal"
        >
          <span>{activeLabel}</span>
          <ChevronDown
            className="size-4 shrink-0 opacity-60"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="z-[70] min-w-[var(--radix-dropdown-menu-trigger-width)] p-1.5"
      >
        <DropdownMenuRadioGroup
          value={value || NOT_PROVIDED_VALUE}
          onValueChange={(nextValue) =>
            onChange(nextValue === NOT_PROVIDED_VALUE ? "" : nextValue)
          }
        >
          {GENDER_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="min-h-11 px-3 pr-8 text-base"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
