"use client";

import * as React from "react";
import { ChevronDown, Moon, Monitor, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutButton } from "@/components/auth/sign-out-button";

interface AdminAccountMenuProps {
  email: string;
}

const emptySubscribe = () => () => {};

export function AdminAccountMenu({ email }: AdminAccountMenuProps) {
  const { setTheme, theme } = useTheme();
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const initial = email.trim().charAt(0).toUpperCase() || "A";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="border-border/80 bg-card hover:bg-muted size-11 rounded-xl border p-1 shadow-sm sm:h-11 sm:w-auto sm:gap-2 sm:pr-2 sm:pl-1.5"
          aria-label="Open account menu"
        >
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm font-bold">
            {initial}
          </span>
          <ChevronDown
            className="text-muted-foreground hidden size-4 sm:block"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 rounded-xl p-2.5">
        <DropdownMenuLabel className="px-3 py-2 font-normal">
          <p className="text-foreground text-sm font-semibold">Admin account</p>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {email}
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-muted-foreground px-3 py-2 text-xs font-medium">
          Appearance
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={mounted ? theme : undefined}
          onValueChange={setTheme}
        >
          <DropdownMenuRadioItem
            value="light"
            className="min-h-11 gap-3 px-3 pr-10"
          >
            <Sun className="size-4" aria-hidden="true" />
            <span>Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="dark"
            className="min-h-11 gap-3 px-3 pr-10"
          >
            <Moon className="size-4" aria-hidden="true" />
            <span>Dark</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="system"
            className="min-h-11 gap-3 px-3 pr-10"
          >
            <Monitor className="size-4" aria-hidden="true" />
            <span>System</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="min-h-11 p-0">
            <SignOutButton className="min-h-11 w-full justify-start gap-3 px-3 sm:min-h-11" />
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
