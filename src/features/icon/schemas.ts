import { z } from "zod";

const iconNameRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const addFrequentIconSchema = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Icon name is required.")
    .regex(
      iconNameRegex,
      "Icon name must be a valid kebab-case Lucide identifier.",
    ),
});

export const removeFrequentIconSchema = z.object({
  id: z.string().uuid("Invalid icon identifier."),
});

export const reorderFrequentIconsSchema = z.object({
  orderedIds: z.array(z.string().uuid("Invalid icon identifier.")).min(1),
});

export type AddFrequentIconInput = z.infer<typeof addFrequentIconSchema>;
export type RemoveFrequentIconInput = z.infer<typeof removeFrequentIconSchema>;
export type ReorderFrequentIconsInput = z.infer<
  typeof reorderFrequentIconsSchema
>;
