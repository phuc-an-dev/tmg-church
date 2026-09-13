import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLockupProps {
  className?: string;
  name?: string;
  subtitle?: string;
}

export function BrandLockup({
  className,
  name = "TMG Church",
  subtitle,
}: BrandLockupProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="bg-primary/10 ring-primary/15 flex shrink-0 items-center justify-center rounded-xl p-1.5 ring-1">
        <Image
          src="/images/tmg-church-mark-concept-v1.png"
          alt=""
          width={44}
          height={44}
          priority
          className="size-9 object-contain"
        />
      </div>
      <div className="min-w-0">
        <p className="text-foreground truncate text-base font-semibold tracking-tight">
          {name}
        </p>
        {subtitle && (
          <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
