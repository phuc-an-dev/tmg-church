import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLockupProps {
  className?: string;
  compact?: boolean;
  name?: string;
  subtitle?: string;
}

export function BrandLockup({
  className,
  compact = false,
  name = "TMG Church",
  subtitle,
}: BrandLockupProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="bg-primary/10 ring-primary/10 flex shrink-0 items-center justify-center rounded-2xl p-1.5 ring-1">
        <Image
          src="/images/tmg-church-mark-concept-v1.png"
          alt={compact ? "TMG Church" : ""}
          width={44}
          height={44}
          priority
          className="size-9 object-contain"
        />
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="text-foreground truncate text-base font-semibold tracking-tight">
            {name}
          </p>
          {subtitle && (
            <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
}
