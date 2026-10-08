"use client";
import { useEffect, useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { verifyRegistrationEmail, resendRegistrationCode } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusToast } from "@/components/ui/status-toast";

export function EmailVerificationForm({ email }: { email: string }) {
  const [code, setCode] = useState("");
  const [remaining, setRemaining] = useState(60);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(
      () => setRemaining((value) => value - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [remaining]);
  function verify(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await verifyRegistrationEmail({ email, code });
      if (!result.success) setNotice({ message: result.error, error: true });
    });
  }
  function resend() {
    if (pending || remaining > 0) return;
    setNotice(null);
    startTransition(async () => {
      const result = await resendRegistrationCode({ email });
      setRemaining(60);
      setNotice({
        message: result.success
          ? "A new code has been sent."
          : (result.error ?? "Unable to resend code."),
        error: !result.success,
      });
    });
  }
  return (
    <div className="space-y-6">
      {notice && (
        <StatusToast
          key={notice.message}
          message={notice.message}
          variant={notice.error ? "error" : "success"}
          duration={notice.error ? 0 : 5000}
          action={
            notice.error
              ? { label: "Dismiss", onClick: () => setNotice(null) }
              : undefined
          }
          onDismiss={() => setNotice(null)}
        />
      )}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
            <Mail className="size-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            Verify your email
          </h1>
        </div>
        <div className="bg-muted/30 rounded-xl border px-4 py-3">
          <p className="text-muted-foreground text-xs">Code sent to</p>
          <p className="mt-1 text-sm font-medium break-all">{email}</p>
        </div>
      </div>
      <form onSubmit={verify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-verification-code">Verification code</Label>
          <div className="group relative">
            <input
              id="email-verification-code"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              disabled={pending}
              className="absolute inset-0 z-10 h-full w-full cursor-text rounded-md border-0 bg-transparent text-base text-transparent caret-transparent outline-none disabled:cursor-not-allowed"
              aria-describedby="verification-help"
            />
            <div className="grid grid-cols-6 gap-2" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <span
                  key={index}
                  className={`bg-muted/20 flex h-12 min-w-0 items-center justify-center rounded-md border font-mono text-xl tabular-nums sm:h-14 ${index === Math.min(code.length, 5) ? "group-focus-within:border-primary group-focus-within:ring-primary/20 group-focus-within:ring-2" : "border-input"} ${pending ? "opacity-50" : ""}`}
                >
                  {code[index] ?? ""}
                </span>
              ))}
            </div>
          </div>
          <p
            id="verification-help"
            className="text-muted-foreground text-xs leading-relaxed"
          >
            Enter the 6-digit code from your email.
          </p>
        </div>
        <Button
          type="submit"
          disabled={pending || code.length !== 6}
          className="min-h-12 w-full"
        >
          {pending ? "Processing..." : "Verify email"}
        </Button>
      </form>
      <div className="border-border space-y-3 border-t pt-3">
        <div className="flex flex-wrap items-center justify-center gap-x-1">
          <span className="text-muted-foreground text-sm">
            Didn’t receive a code?
          </span>
          <Button
            type="button"
            variant="ghost"
            disabled={pending || remaining > 0}
            onClick={resend}
            className="text-primary min-h-11"
          >
            {remaining > 0 ? `Resend in ${remaining}s` : "Resend code"}
          </Button>
        </div>
      </div>
    </div>
  );
}
