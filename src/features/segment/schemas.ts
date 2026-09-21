import { z } from "zod";
import dynamicIconImports from "lucide-react/dynamicIconImports";

const id = z.string().uuid("Invalid record identifier.");
const name = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(120, "Name cannot exceed 120 characters.");
export const saveSegmentSchema = z.object({
  id: id.optional(),
  name,
  accentColor: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^#[0-9a-f]{6}$/, "Use a six-digit hex color."),
  iconKey: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Choose a valid Lucide icon.")
    .refine(
      (value) => value in dynamicIconImports,
      "Choose a valid Lucide icon.",
    ),
});
export const deleteSegmentSchema = z.object({ id });
const conditionField = z.enum([
  "gender",
  "date_of_birth",
  "full_name",
  "phone",
]);
const conditionOperator = z.enum([
  "equals",
  "not_equals",
  "greater_than",
  "greater_than_or_equal",
  "less_than",
  "less_than_or_equal",
  "starts_with",
  "ends_with",
  "contains",
]);
export const segmentConditionSchema = z
  .object({
    field: conditionField,
    operator: conditionOperator,
    value: z.string().trim().min(1, "Enter a value.").max(120),
    connector: z.enum(["and", "or"]).optional(),
  })
  .superRefine((condition, context) => {
    const numericOperators = new Set([
      "equals",
      "not_equals",
      "greater_than",
      "greater_than_or_equal",
      "less_than",
      "less_than_or_equal",
    ]);
    const textOperators = new Set([
      "equals",
      "not_equals",
      "starts_with",
      "ends_with",
      "contains",
    ]);
    if (
      condition.field === "date_of_birth" &&
      (!numericOperators.has(condition.operator) ||
        !isValidDateOfBirth(condition.value))
    ) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "Use a date between 1900-01-01 and 2100-12-31.",
      });
    }
    if (
      (condition.field === "full_name" || condition.field === "phone") &&
      !textOperators.has(condition.operator)
    ) {
      context.addIssue({
        code: "custom",
        path: ["operator"],
        message: "Choose a text comparison.",
      });
    }
    if (
      condition.field === "gender" &&
      (!new Set(["equals", "not_equals"]).has(condition.operator) ||
        !new Set(["female", "male"]).has(condition.value))
    ) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "Choose a gender.",
      });
    }
  });

function isValidDateOfBirth(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match || value < "1900-01-01" || value > "2100-12-31") return false;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}
export const segmentConditionsSchema = z.object({
  segmentId: id,
  conditions: z
    .array(segmentConditionSchema)
    .min(1)
    .max(10)
    .superRefine((conditions, context) => {
      conditions.forEach((condition, index) => {
        if (index === 0 && condition.connector !== undefined) {
          context.addIssue({
            code: "custom",
            path: [index, "connector"],
            message: "The first condition cannot have a connector.",
          });
        }
        if (index > 0 && condition.connector === undefined) {
          context.addIssue({
            code: "custom",
            path: [index, "connector"],
            message: "Choose AND or OR.",
          });
        }
      });
    }),
});
