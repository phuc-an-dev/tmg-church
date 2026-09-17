import { z } from "zod";

export const GROUP_ROLES = [
  "member",
  "group_leader",
  "deputy_leader",
  "bible_study_leader",
] as const;

export type GroupRole = (typeof GROUP_ROLES)[number];

export const GROUP_ROLE_LABELS: Record<GroupRole, string> = {
  member: "Member",
  group_leader: "Group Leader",
  deputy_leader: "Deputy Leader",
  bible_study_leader: "Bible Study Leader",
};

export const GROUP_STATUSES = [
  "active",
  "inactive",
  "transferred",
  "left",
] as const;

export type GroupStatus = (typeof GROUP_STATUSES)[number];

export const GROUP_STATUS_LABELS: Record<GroupStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  transferred: "Transferred",
  left: "Left",
};

export const groupRoleSchema = z.enum(GROUP_ROLES);
export const groupStatusSchema = z.enum(GROUP_STATUSES);

export const assignGroupMemberSchema = z.object({
  groupId: z.string().uuid("Invalid group ID"),
  membershipId: z.string().uuid("Invalid membership ID"),
});

export type AssignGroupMemberInput = z.infer<typeof assignGroupMemberSchema>;

export const assignGroupMembersSchema = z.object({
  groupId: z.string().uuid("Invalid group ID"),
  membershipIds: z
    .array(z.string().uuid("Invalid membership ID"))
    .min(1, "Select at least one member to assign"),
});

export type AssignGroupMembersInput = z.infer<typeof assignGroupMembersSchema>;

export const updateGroupMemberRoleSchema = z.object({
  recordId: z.string().uuid("Invalid group membership record ID"),
  role: groupRoleSchema,
});

export type UpdateGroupMemberRoleInput = z.infer<
  typeof updateGroupMemberRoleSchema
>;

export const updateGroupMemberStatusSchema = z.object({
  recordId: z.string().uuid("Invalid group membership record ID"),
  status: z.enum(["active", "inactive", "left"]),
});

export type UpdateGroupMemberStatusInput = z.infer<
  typeof updateGroupMemberStatusSchema
>;

export const leaveGroupSchema = z.object({
  recordId: z.string().uuid("Invalid group membership record ID"),
});

export type LeaveGroupInput = z.infer<typeof leaveGroupSchema>;
