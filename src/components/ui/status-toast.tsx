"use client";

import * as React from "react";
import { Portal } from "radix-ui";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface StatusToastProps {
  message: string;
  variant?: "success" | "error";
  onDismiss: () => void;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function StatusToast({
  message,
  variant = "success",
  onDismiss,
  duration = 2200,
  action,
}: StatusToastProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [touchOffsetY, setTouchOffsetY] = React.useState(0);
  const dismissedRef = React.useRef(false);
  const startYRef = React.useRef<number | null>(null);
  const actionRef = React.useRef<(() => void) | null>(null);
  const exitTimerRef = React.useRef<number | null>(null);

  const dismissOnce = React.useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    actionRef.current?.();
    onDismiss();
  }, [onDismiss]);

  const startDismiss = () => {
    setTouchOffsetY(0);
    setIsVisible(false);
    if (exitTimerRef.current !== null) return;
    exitTimerRef.current = window.setTimeout(dismissOnce, 350);
  };

  React.useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null)
        window.clearTimeout(exitTimerRef.current);
    };
  }, []);

  React.useEffect(() => {
    let visibleFrame: number | undefined;
    const enterFrame = window.requestAnimationFrame(() => {
      visibleFrame = window.requestAnimationFrame(() => setIsVisible(true));
    });
    if (duration <= 0) {
      return () => {
        window.cancelAnimationFrame(enterFrame);
        if (visibleFrame !== undefined)
          window.cancelAnimationFrame(visibleFrame);
      };
    }
    const exitTimeoutId = window.setTimeout(
      () => setIsVisible(false),
      Math.max(0, duration - 300),
    );
    const dismissFallbackId = window.setTimeout(dismissOnce, duration + 50);

    return () => {
      window.cancelAnimationFrame(enterFrame);
      if (visibleFrame !== undefined) window.cancelAnimationFrame(visibleFrame);
      window.clearTimeout(exitTimeoutId);
      window.clearTimeout(dismissFallbackId);
    };
  }, [dismissOnce, duration]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    startYRef.current = event.touches[0].clientY;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (startYRef.current === null) return;
    const deltaY = event.touches[0].clientY - startYRef.current;
    if (deltaY > 0) {
      setTouchOffsetY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (touchOffsetY > 30) {
      startDismiss();
    } else {
      setTouchOffsetY(0);
    }
    startYRef.current = null;
  };

  const Icon = variant === "error" ? AlertCircle : CheckCircle2;

  return (
    <Portal.Root asChild>
      <div className="pointer-events-none fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[80] flex justify-center sm:bottom-5">
        <div
          role={variant === "error" ? "alert" : "status"}
          aria-live={variant === "error" ? "assertive" : "polite"}
          data-visible={isVisible}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform:
              touchOffsetY > 0 ? `translateY(${touchOffsetY}px)` : undefined,
            opacity:
              touchOffsetY > 0 ? Math.max(0, 1 - touchOffsetY / 80) : undefined,
            touchAction: "pan-y",
          }}
          onTransitionEnd={(event) => {
            if (
              !isVisible &&
              event.currentTarget === event.target &&
              event.propertyName === "opacity"
            ) {
              dismissOnce();
            }
          }}
          className="border-border/80 bg-card text-foreground pointer-events-auto flex max-w-md translate-y-[calc(100%+2rem)] cursor-grab items-center gap-3 rounded-xl border px-5 py-3.5 text-base font-medium opacity-0 shadow-lg transition-[opacity,translate,transform] duration-300 ease-out active:cursor-grabbing data-[visible=true]:translate-y-0 data-[visible=true]:opacity-100 motion-reduce:transition-none"
        >
          <Icon
            className={`size-5 shrink-0 ${variant === "error" ? "text-destructive" : "text-primary"}`}
            aria-hidden="true"
          />
          <div className="flex flex-1 items-center justify-between gap-3">
            <span>{message}</span>
            {action && (
              <button
                type="button"
                onClick={() => {
                  actionRef.current = action.onClick;
                  startDismiss();
                }}
                className="text-primary min-h-11 min-w-11 shrink-0 cursor-pointer text-sm font-semibold hover:underline"
              >
                {action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal.Root>
  );
}
