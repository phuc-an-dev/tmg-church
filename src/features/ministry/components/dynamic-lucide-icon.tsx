"use client";

import { CircleHelp } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import type { IconName } from "lucide-react/dynamic";

export function DynamicLucideIcon({
  iconKey,
  className,
}: {
  iconKey: string;
  className?: string;
}) {
  return (
    <DynamicIcon
      name={iconKey as IconName}
      className={className}
      fallback={() => <CircleHelp className={className} aria-hidden="true" />}
      aria-hidden="true"
    />
  );
}
