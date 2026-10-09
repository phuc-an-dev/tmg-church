import { z } from "zod";

const id = z.string().uuid("Invalid record identifier.");
const slug = z.string().trim().min(1).max(200);
export const careDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Use a valid calendar date.")
  .nullable();
export const careFiltersSchema = z.object({
  groupSlug: slug.nullable(),
  tab: z.enum(["open", "suggestions", "history"]),
  page: z.number().int().positive().max(1000000),
  q: z.string().trim().max(100),
});
export const createCareFollowUpSchema = z.object({
  groupId: id,
  memberId: id,
  assigneeId: id,
  nextContactDate: careDateSchema,
  source: z.enum(["manual", "attendance"]),
});
export const updateCareFollowUpSchema = z.object({
  caseId: id,
  status: z.enum(["open", "in_progress", "resolved"]),
  nextContactDate: careDateSchema,
});
export const assignCareFollowUpSchema = z.object({
  caseId: id,
  assigneeId: id,
});
export const addCareNoteSchema = z.object({
  caseId: id,
  note: z.string().trim().min(1, "Enter a note.").max(4000),
});
export const loadCareDetailSchema = z.object({
  ministrySlug: slug,
  termSlug: slug,
  careSlug: z.string().regex(/^care-[a-f0-9]{32}$/),
});
export const loadCareGroupOptionsSchema = z.object({ groupId: id });
