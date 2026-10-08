import { z } from "zod";
import { createMemberSchema } from "@/features/member/schemas";

export const registrationSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Enter your full name.")
      .max(150, "Use at most 150 characters."),
    email: z
      .string()
      .trim()
      .min(1, "Enter your email address.")
      .email("Enter a valid email address.")
      .toLowerCase(),
    phone: z.string().trim().max(30, "Use at most 30 characters."),
    dateOfBirth: z
      .string()
      .min(1, "Enter your date of birth.")
      .pipe(createMemberSchema.shape.dateOfBirth.unwrap().unwrap()),
    gender: z
      .string()
      .refine(
        (value) => value === "male" || value === "female",
        "Select your gender.",
      ),
    password: z
      .string()
      .min(1, "Enter your password.")
      .min(8, "Use at least 8 characters.")
      .max(128, "Use at most 128 characters."),
    confirmation: z.string().min(1, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ["confirmation"],
    message: "Passwords do not match.",
  });

export type RegistrationValues = z.input<typeof registrationSchema>;
export type RegistrationErrors = Partial<
  Record<keyof RegistrationValues, string[]>
>;
