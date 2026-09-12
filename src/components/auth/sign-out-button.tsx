"use client";

import { useTransition } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

interface SignOutButtonProps {
  className?: string;
  variant?: "header" | "page";
}

export function SignOutButton({
  className = "",
  variant = "header",
}: SignOutButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut();
    });
  };

  if (variant === "page") {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={handleSignOut}
        disabled={isPending}
        className={`min-h-[44px] gap-2 ${className}`}
      >
        {isPending ? (
          <Loader2
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <LogOut className="size-4" aria-hidden="true" />
        )}
        <span>Đăng xuất</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      disabled={isPending}
      title="Đăng xuất khỏi hệ thống quản trị"
      aria-label="Đăng xuất"
      className={`text-muted-foreground hover:text-foreground min-h-[44px] gap-1.5 text-xs sm:min-h-0 ${className}`}
    >
      {isPending ? (
        <Loader2
          className="size-3.5 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : (
        <LogOut className="size-3.5" aria-hidden="true" />
      )}
      <span>Đăng xuất</span>
    </Button>
  );
}
