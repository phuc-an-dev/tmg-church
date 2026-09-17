import { z } from "zod";

const id = z.string().uuid("Invalid record identifier");

export const sessionSchema = z
  .object({
    id: id.optional(),
    ministryTermId: id,
    termGroupId: id.optional(),
    termDepartmentId: id.optional(),
    title: z.string().trim().min(1, "Title is required").max(160),
    sessionDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
      .refine(
        (value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)),
        "Use a valid calendar date",
      ),
  })
  .refine(
    (value) => !(value.termGroupId && value.termDepartmentId),
    "A session can target either a Group or Department, not both.",
  );

export const deleteSessionSchema = z.object({ id });

export const attendanceSchema = z.object({
  sessionId: id,
  memberId: id,
  status: z.enum(["present", "absent", "excused"]),
});

export const bulkAttendanceSchema = z.object({
  sessionId: id,
  memberIds: z.array(id).min(1, "Select at least one member"),
  status: z.enum(["present", "absent", "excused"]),
});

export const saveServiceAssignmentSchema = z.object({
  sessionId: id,
  roleId: id,
  membershipId: id,
});

export const batchSaveServiceAssignmentsSchema = z.object({
  sessionId: id,
  roleId: id,
  membershipIds: z.array(id).min(1, "Select at least one member"),
});

export const removeServiceAssignmentSchema = z.object({
  sessionId: id,
  assignmentId: id,
});
