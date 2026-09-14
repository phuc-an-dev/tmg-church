"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";

interface StatusToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export function StatusToast({
  message,
  onDismiss,
  duration = 4000,
}: StatusToastProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const dismissedRef = React.useRef(false);

  const dismissOnce = React.useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onDismiss();
  }, [onDismiss]);

  React.useEffect(() => {
    const enterFrame = window.requestAnimationFrame(() => setIsVisible(true));
    const exitTimeoutId = window.setTimeout(
      () => setIsVisible(false),
      Math.max(0, duration - 200),
    );
    const dismissFallbackId = window.setTimeout(dismissOnce, duration + 100);

    return () => {
      window.cancelAnimationFrame(enterFrame);
      window.clearTimeout(exitTimeoutId);
      window.clearTimeout(dismissFallbackId);
    };
  }, [dismissOnce, duration]);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[80] flex justify-center sm:bottom-5">
      <div
        role="status"
        aria-live="polite"
        data-visible={isVisible}
        onTransitionEnd={(event) => {
          if (
            !isVisible &&
            event.currentTarget === event.target &&
            event.propertyName === "opacity"
          ) {
            dismissOnce();
          }
        }}
        className="border-border/80 bg-card text-foreground flex max-w-md translate-y-4 items-center gap-3 rounded-xl border px-5 py-4 text-base font-medium opacity-0 shadow-lg transition-[opacity,transform] duration-200 data-[visible=true]:translate-y-0 data-[visible=true]:opacity-100 motion-reduce:transition-none"
      >
        <CheckCircle2
          className="text-primary size-5 shrink-0"
          aria-hidden="true"
        />
        <span>{message}</span>
      </div>
    </div>
  );
}
