"use client";
import { useActionState, useRef, useState } from "react";
import { z } from "zod";
import Link from "next/link";
import { registerAccount, type RegistrationState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { GenderDropdown } from "@/features/member/components/gender-dropdown";
import { Label } from "@/components/ui/label";
import { StatusToast } from "@/components/ui/status-toast";
import {
  registrationSchema,
  type RegistrationErrors,
  type RegistrationValues,
} from "./registration-schema";

export function RegistrationForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [values, setValues] = useState<RegistrationValues>({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    password: "",
    confirmation: "",
  });
  const [fieldErrors, setFieldErrors] = useState<RegistrationErrors>({});
  const [noticeId, setNoticeId] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  function showFieldErrors(errors: RegistrationErrors) {
    const firstField = (
      Object.keys(values) as (keyof RegistrationValues)[]
    ).find((name) => errors[name]?.length);
    setFieldErrors(firstField ? { [firstField]: errors[firstField] } : {});
    if (firstField) {
      setMessage(errors[firstField]?.[0] ?? "Check this field.");
      window.requestAnimationFrame(() => {
        const input = document.getElementById(`register-${firstField}`);
        input?.focus();
      });
    }
  }
  const [, action, pending] = useActionState<RegistrationState, FormData>(
    async (previous: RegistrationState, formData: FormData) => {
      setMessage(null);
      setFieldErrors({});
      setNoticeId((value) => value + 1);
      const parsed = registrationSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) {
        const errors = z.flattenError(parsed.error).fieldErrors;
        showFieldErrors(errors);
        return { status: "error", fieldErrors: errors };
      }
      const result = await registerAccount(previous, formData);
      if (result.fieldErrors) showFieldErrors(result.fieldErrors);
      else if (result.status === "error")
        setMessage(result.message ?? "Unable to register.");
      return result;
    },
    { status: "idle" },
  );
  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      {message && (
        <StatusToast
          key={noticeId}
          message={message}
          variant="error"
          duration={2300}
          action={{ label: "Dismiss", onClick: () => setMessage(null) }}
          onDismiss={() => setMessage(null)}
        />
      )}
      {(
        [
          {
            name: "fullName",
            label: "Full name",
            type: "text",
            autoComplete: "name",
          },
          {
            name: "email",
            label: "Email",
            type: "email",
            autoComplete: "email",
          },
          {
            name: "phone",
            label: "Phone (optional)",
            type: "tel",
            autoComplete: "tel",
          },
          {
            name: "dateOfBirth",
            label: "Date of birth",
            type: "text",
            autoComplete: "bday",
          },
          {
            name: "gender",
            label: "Gender",
            type: "text",
            autoComplete: "sex",
          },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "new-password",
          },
          {
            name: "confirmation",
            label: "Confirm password",
            type: "password",
            autoComplete: "new-password",
          },
        ] as const
      ).map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={`register-${field.name}`}>{field.label}</Label>
          {field.name === "dateOfBirth" ? (
            <DatePicker
              id="register-dateOfBirth"
              name="dateOfBirth"
              value={values.dateOfBirth}
              onChange={(value) =>
                setValues((previous) => ({ ...previous, dateOfBirth: value }))
              }
              defaultMonth={new Date(2000, 0, 1)}
              startMonth={new Date(1900, 0, 1)}
              max={new Date().toISOString().slice(0, 10)}
              dateFormat="dd/MM/yyyy"
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.dateOfBirth?.length)}
              className="min-h-12 text-base"
            />
          ) : field.name === "gender" ? (
            <div
              className={
                fieldErrors.gender?.length
                  ? "ring-destructive/30 [&_button]:border-destructive rounded-md ring-2"
                  : undefined
              }
            >
              <input type="hidden" name="gender" value={values.gender} />
              <GenderDropdown
                id="register-gender"
                value={values.gender}
                onChange={(value) =>
                  setValues((previous) => ({ ...previous, gender: value }))
                }
                disabled={pending}
              />
            </div>
          ) : (
            <Input
              id={`register-${field.name}`}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              value={values[field.name]}
              onChange={(event) => {
                const next = { ...values, [field.name]: event.target.value };
                setValues(next);
              }}
              aria-invalid={Boolean(fieldErrors[field.name]?.length)}
              aria-describedby={
                field.name === "password" ? "register-password-help" : undefined
              }
              disabled={pending}
              className="min-h-12 text-base"
              maxLength={
                field.name === "fullName"
                  ? 150
                  : field.name === "phone"
                    ? 30
                    : field.name === "email"
                      ? 254
                      : 128
              }
            />
          )}
          {field.name === "password" && (
            <p
              id="register-password-help"
              className="text-muted-foreground text-sm"
            >
              Use at least 8 characters.
            </p>
          )}
        </div>
      ))}
      <Button type="submit" disabled={pending} className="min-h-12 w-full">
        {pending ? "Creating account..." : "Create account"}
      </Button>
      <div className="text-muted-foreground flex min-h-11 flex-wrap items-center justify-center gap-x-1 text-sm">
        <span>Already have an account?</span>
        <Link
          href="/login"
          className="text-primary inline-flex min-h-11 items-center"
        >
          Sign in
        </Link>
      </div>
    </form>
  );
}
