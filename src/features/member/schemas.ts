import { z } from "zod";

export const memberIdSchema = z.uuid();

export const updateMemberSchema = z.object({
  id: memberIdSchema,
  fullName: z.string().trim().min(1, "Enter the member's full name."),
  phone: z.string().trim(),
  birthYear: z
    .number()
    .int("Enter a whole year.")
    .min(1900, "Birth year must be 1900 or later.")
    .max(2100, "Birth year must be 2100 or earlier.")
    .nullable(),
});
