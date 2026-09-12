import { z } from "zod";

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createChurchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Church name is required")
    .max(120, "Church name cannot exceed 120 characters"),
  slug: z
    .string()
    .trim()
    .max(120, "Slug cannot exceed 120 characters")
    .optional()
    .refine(
      (val) => !val || SLUG_REGEX.test(val),
      "Slug may only contain lowercase letters, numbers, and single hyphens",
    ),
});

export type CreateChurchInput = z.infer<typeof createChurchSchema>;

export const updateChurchSchema = z.object({
  id: z.string().uuid("Invalid church identifier"),
  name: z
    .string()
    .trim()
    .min(1, "Church name is required")
    .max(120, "Church name cannot exceed 120 characters"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120, "Slug cannot exceed 120 characters")
    .regex(
      SLUG_REGEX,
      "Slug may only contain lowercase letters, numbers, and single hyphens",
    ),
});

export type UpdateChurchInput = z.infer<typeof updateChurchSchema>;

export const deleteChurchSchema = z.object({
  id: z.string().uuid("Invalid church identifier"),
  // Note: confirmationName is not trimmed to ensure genuinely exact match
  confirmationName: z
    .string()
    .min(1, "Please enter the church name to confirm deletion"),
});

export type DeleteChurchInput = z.infer<typeof deleteChurchSchema>;
