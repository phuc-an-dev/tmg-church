"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  activateMemberAccountAction,
  type ActivationActionState,
} from "@/features/auth/invitation-actions";

const initialState: ActivationActionState = { status: "idle" };

interface ActivationFormProps {
  email: string;
  token: string;
}

export function ActivationForm({ email, token }: ActivationFormProps) {
  const [state, formAction, isPending] = useActionState(
    activateMemberAccountAction,
    initialState,
  );

  if (state.status === "check-email") {
    return (
      <div className="admin-surface flex items-start gap-3 p-5" role="status">
        <CheckCircle2
          className="text-primary mt-0.5 size-5 shrink-0"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <h2 className="text-card-foreground font-semibold">
            Check your inbox
          </h2>
          <p className="text-muted-foreground text-sm leading-6">
            {state.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.status === "error" && state.message && (
        <div
          role="alert"
          className="border-destructive/20 bg-destructive/10 text-destructive flex items-start gap-2.5 rounded-lg border p-4 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{state.message}</span>
        </div>
      )}

      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />
      <div className="space-y-2">
        <label
          htmlFor="activation-email"
          className="text-foreground text-sm font-medium"
        >
          Invited email
        </label>
        <Input
          id="activation-email"
          value={email}
          readOnly
          className="h-12 px-4 text-base"
        />
      </div>
      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-foreground text-sm font-medium"
        >
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={isPending}
          className="h-12 px-4 text-base"
        />
      </div>
      <div className="space-y-2">
        <label
          htmlFor="passwordConfirmation"
          className="text-foreground text-sm font-medium"
        >
          Confirm password
        </label>
        <Input
          id="passwordConfirmation"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={isPending}
          className="h-12 px-4 text-base"
        />
      </div>
      <Button type="submit" disabled={isPending} className="h-12 w-full gap-2">
        {isPending ? (
          <>
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span>Activating account...</span>
          </>
        ) : (
          <>
            <LockKeyhole className="size-4" aria-hidden="true" />
            <span>Activate account</span>
          </>
        )}
      </Button>
    </form>
  );
}
