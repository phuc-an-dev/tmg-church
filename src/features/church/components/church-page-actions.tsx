"use client";

import Link from "next/link";
import { Ellipsis, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ChurchPageActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-h-11 gap-2 px-4">
          <Ellipsis className="size-4" aria-hidden="true" />
          <span>More</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-xl p-2">
        <DropdownMenuItem asChild className="min-h-11 gap-3 px-3 py-2">
          <Link href="/admin/church/advanced">
            <Settings2 className="size-4" aria-hidden="true" />
            <span>Advanced settings</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
