"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px] rounded-lg"
          aria-label="Select theme"
        >
          {mounted ? (
            theme === "dark" ? (
              <Moon className="size-5" aria-hidden="true" />
            ) : theme === "system" ? (
              <Monitor className="size-5" aria-hidden="true" />
            ) : (
              <Sun className="size-5" aria-hidden="true" />
            )
          ) : (
            <Sun className="size-5 opacity-0" aria-hidden="true" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="min-h-[44px] cursor-pointer"
        >
          <Sun className="mr-2 size-4" aria-hidden="true" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="min-h-[44px] cursor-pointer"
        >
          <Moon className="mr-2 size-4" aria-hidden="true" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="min-h-[44px] cursor-pointer"
        >
          <Monitor className="mr-2 size-4" aria-hidden="true" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
