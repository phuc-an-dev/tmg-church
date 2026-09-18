"use client";

import { useActionState } from "react";
import { LockKeyhole, Loader2, AlertCircle } from "lucide-react";
import { signInWithPassword } from "@/features/auth/actions";
import { initialLoginState } from "@/features/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginFormProps {
  initialErrorMessage?: string;
}

function LoginFormInner({ initialErrorMessage }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    signInWithPassword,
    initialLoginState,
  );

  return (
    <form action={formAction} noValidate className="space-y-5">
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

      <div className="flex flex-col gap-3">
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
          className="h-12 px-4 text-lg"
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

      <div className="flex flex-col gap-3">
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
          autoComplete="current-password"
          required
          disabled={isPending}
          className="h-12 px-4 text-lg"
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-12 w-full gap-2 text-sm font-medium"
      >
        {isPending ? (
          <>
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <LockKeyhole className="size-4" aria-hidden="true" />
            <span>Sign in</span>
          </>
        )}
      </Button>
    </form>
  );
}

export function LoginForm({ initialErrorMessage }: LoginFormProps) {
  return <LoginFormInner initialErrorMessage={initialErrorMessage} />;
}
