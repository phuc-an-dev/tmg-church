import { z } from "zod";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { SLUG_REGEX } from "@/features/church/schemas";

const id = z.string().uuid("Invalid record identifier");
const name = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(120, "Name cannot exceed 120 characters");
const optionalSlug = z
  .string()
  .trim()
  .max(120, "Slug cannot exceed 120 characters")
  .optional()
  .refine(
    (value) => !value || SLUG_REGEX.test(value),
    "Slug may only contain lowercase letters, numbers, and single hyphens",
  );
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .nullable()
  .optional();
const termLifecycle = z.enum(["draft", "active", "closed"], {
  message: "Choose a valid term lifecycle",
});
const iconKey = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Choose a valid Lucide icon")
  .refine((value) => value in dynamicIconImports, "Choose a valid Lucide icon");

export const ministrySchema = z.object({
  id: id.optional(),
  name,
  slug: optionalSlug,
  accentColor: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^#[0-9a-f]{6}$/, "Use a six-digit hex color"),
  iconKey,
});
export const termSchema = z
  .object({
    id: id.optional(),
    ministryId: id,
    name,
    slug: optionalSlug,
    startDate: date,
    endDate: date,
    lifecycle: termLifecycle.default("draft"),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate && value.endDate < value.startDate)
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date cannot be before start date",
      });
  });
export const structureSchema = z.object({
  id: id.optional(),
  ministryId: id,
  termId: id,
  name,
  slug: optionalSlug,
  accentColor: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^#[0-9a-f]{6}$/, "Use a six-digit hex color"),
  iconKey,
});
export const deleteSchema = z.object({
  id,
  parentId: id.optional(),
  ministryId: id.optional(),
});

export const serviceRoleSchema = z.object({
  id: id.optional(),
  termDepartmentId: id,
  name,
});

export const deleteServiceStructureSchema = z.object({
  id,
  termDepartmentId: id,
});
