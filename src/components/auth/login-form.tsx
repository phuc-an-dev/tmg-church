"use client";

import { useActionState, useState } from "react";
import {
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { sendMagicLink } from "@/features/auth/actions";
import { initialLoginState } from "@/features/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginFormProps {
  initialErrorMessage?: string;
}

interface LoginFormInnerProps {
  initialErrorMessage?: string;
  onReset: () => void;
}

function LoginFormInner({ initialErrorMessage, onReset }: LoginFormInnerProps) {
  const [state, formAction, isPending] = useActionState(
    sendMagicLink,
    initialLoginState,
  );
  const [submittedEmail, setSubmittedEmail] = useState("");

  if (state.status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border-border bg-card rounded-xl border p-6 shadow-xs"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2
            className="text-primary mt-0.5 size-5 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-card-foreground text-base font-semibold">
              Sign-in link sent
            </h2>
            <p className="text-muted-foreground text-sm">{state.message}</p>
            {submittedEmail && (
              <p className="text-foreground text-sm font-medium break-all">
                Sent to:{" "}
                <span className="text-primary font-mono font-semibold">
                  {submittedEmail}
                </span>
              </p>
            )}
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onReset}
                className="min-h-[44px] gap-2"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                <span>Resend or enter a different email</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const formData = new FormData(e.currentTarget);
        const email = formData.get("email");
        if (typeof email === "string") {
          setSubmittedEmail(email);
        }
      }}
      noValidate
      className="space-y-5"
    >
      {initialErrorMessage && state.status === "idle" && (
        <div
          role="alert"
          className="border-destructive/20 bg-destructive/10 text-destructive flex items-start gap-2.5 rounded-lg border p-4 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{initialErrorMessage}</span>
        </div>
      )}

      {state.status === "error" && state.message && (
        <div
          role="alert"
          className="border-destructive/20 bg-destructive/10 text-destructive flex items-start gap-2.5 rounded-lg border p-4 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{state.message}</span>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-foreground text-sm font-medium">
          Email address
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          placeholder="leader@tmgchurch.website"
          className="text-base"
          aria-describedby={
            state.fieldErrors?.email ? "email-error" : undefined
          }
          aria-invalid={state.fieldErrors?.email ? "true" : "false"}
        />
        {state.fieldErrors?.email && (
          <p
            id="email-error"
            className="text-destructive text-xs font-medium"
            role="alert"
          >
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 min-h-[44px] w-full gap-2 text-sm font-medium"
      >
        {isPending ? (
          <>
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span>Sending sign-in link...</span>
          </>
        ) : (
          <>
            <Mail className="size-4" aria-hidden="true" />
            <span>Send sign-in link</span>
          </>
        )}
      </Button>
    </form>
  );
}

export function LoginForm({ initialErrorMessage }: LoginFormProps) {
  const [formKey, setFormKey] = useState(0);

  const handleReset = () => {
    setFormKey((k) => k + 1);
  };

  return (
    <LoginFormInner
      key={formKey}
      initialErrorMessage={formKey === 0 ? initialErrorMessage : undefined}
      onReset={handleReset}
    />
  );
}
