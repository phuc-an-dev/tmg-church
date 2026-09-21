export type SegmentItem = {
  id: string;
  accentColor: string;
  iconKey: string;
  name: string;
  slug: string;
  memberCount: number;
};
export type SegmentDetail = SegmentItem & { conditions: SegmentCondition[] };
export type SegmentCondition = {
  field: "gender" | "date_of_birth" | "full_name" | "phone";
  operator:
    | "equals"
    | "not_equals"
    | "greater_than"
    | "greater_than_or_equal"
    | "less_than"
    | "less_than_or_equal"
    | "year_equals"
    | "year_not_equals"
    | "starts_with"
    | "ends_with"
    | "contains";
  value: string;
  connector?: "and" | "or";
};
export type SegmentActionResult =
  | { success: true; data?: { slug: string }; message: string }
  | {
      success: false;
      code: string;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };
