import { z } from "zod";

export const memberIdSchema = z.string().uuid("Invalid member ID.");

export const createMemberSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Enter the member's full name.")
    .max(120, "Full name must be 120 characters or fewer."),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number must be 30 characters or fewer."),
  birthYear: z
    .number()
    .int("Enter a whole year.")
    .min(1900, "Birth year must be 1900 or later.")
    .max(2100, "Birth year must be 2100 or earlier.")
    .nullable(),
  gender: z.enum(["female", "male"]).nullable().optional(),
});

export const updateMemberSchema = createMemberSchema.extend({
  id: memberIdSchema,
});

export const archiveMemberSchema = z.object({
  id: memberIdSchema,
});

export const restoreMemberSchema = z.object({
  id: memberIdSchema,
});

export const setMemberSegmentsSchema = z.object({
  memberId: memberIdSchema,
  segmentIds: z
    .array(z.string().uuid("Invalid segment ID."))
    .max(200, "Select 200 segments or fewer.")
    .refine(
      (segmentIds) => new Set(segmentIds).size === segmentIds.length,
      "Each segment can only be selected once.",
    ),
});

export const enrollMemberWithAssignmentsSchema = z.object({
  memberId: memberIdSchema,
  ministryTermId: z.string().uuid("Invalid ministry term ID."),
  termGroupId: z.string().uuid("Invalid term group ID.").nullable(),
  departmentIds: z
    .array(z.string().uuid("Invalid department ID."))
    .refine(
      (departmentIds) => new Set(departmentIds).size === departmentIds.length,
      "Each department can only be selected once.",
    ),
});

export const removeMinistryMembershipSchema = z.object({
  membershipId: z.string().uuid("Invalid membership ID."),
  memberId: memberIdSchema,
});

export const assignTermGroupSchema = z.object({
  membershipId: z.string().uuid("Invalid membership ID."),
  memberId: memberIdSchema,
  termGroupId: z.string().uuid("Invalid term group ID.").nullable(),
});

export const setMinistryAssignmentsSchema = z.object({
  membershipId: z.string().uuid("Invalid membership ID."),
  memberId: memberIdSchema,
  termDepartmentIds: z
    .array(z.string().uuid("Invalid department ID."))
    .refine(
      (departmentIds) => new Set(departmentIds).size === departmentIds.length,
      "Each department can only be selected once.",
    ),
});

export const importMemberItemSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required.")
    .max(120, "Full name must be 120 characters or fewer."),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number must be 30 characters or fewer.")
    .nullable()
    .optional(),
  birthYear: z
    .number()
    .int("Enter a whole year.")
    .min(1900, "Birth year must be 1900 or later.")
    .max(2100, "Birth year must be 2100 or earlier.")
    .nullable()
    .optional(),
  gender: z.enum(["female", "male"]).nullable().optional(),
});

export const importMembersSchema = z.object({
  members: z
    .array(importMemberItemSchema)
    .min(1, "At least one member is required to import."),
});

export type ImportMemberItemInput = z.infer<typeof importMemberItemSchema>;
export type ImportMembersInput = z.infer<typeof importMembersSchema>;
