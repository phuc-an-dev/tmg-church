"use client";

import { useActionState, useState } from "react";
import { LockKeyhole, Loader2 } from "lucide-react";
import { signInWithPassword } from "@/features/auth/actions";
import { initialLoginState } from "@/features/auth/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusToast } from "@/components/ui/status-toast";

interface LoginFormProps {
  initialErrorMessage?: string;
}

function LoginFormInner({ initialErrorMessage }: LoginFormProps) {
  const [toast, setToast] = useState<{ message: string; id: number } | null>(
    initialErrorMessage ? { message: initialErrorMessage, id: 0 } : null,
  );
  const [state, formAction, isPending] = useActionState(
    async (previousState: typeof initialLoginState, formData: FormData) => {
      setToast(null);
      const result = await signInWithPassword(previousState, formData);
      if (result.status === "error" && result.message) {
        setToast({ message: result.message, id: Date.now() });
      }
      return result;
    },
    initialLoginState,
  );

  return (
    <form
      action={formAction}
      noValidate
      autoComplete="off"
      className="space-y-5"
    >
      {toast && (
        <StatusToast
          key={toast.id}
          message={toast.message}
          variant="error"
          duration={5000}
          onDismiss={() => setToast(null)}
        />
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-foreground text-sm font-medium">
          Email address
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="off"
          required
          disabled={isPending}
          placeholder="leader@tmgchurch.website"
          className="h-12 px-4 text-lg"
          aria-invalid={state.fieldErrors?.email ? "true" : "false"}
        />
      </div>

      <div className="flex flex-col gap-1.5">
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
