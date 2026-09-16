export type ActionResult<T = unknown> =
  | { success: true; data: T; message: string }
  | {
      success: false;
      error: string;
      code: string;
      fieldErrors?: Record<string, string[]>;
    };

export type PageResult<T> = {
  items: T[];
  count: number;
  page: number;
  pageSize: number;
};

export type MinistryItem = {
  id: string;
  name: string;
  slug: string;
  accentColor: string;
  iconKey: string;
  termCount: number;
  currentTermSlug: string | null;
};
export type TermItem = {
  id: string;
  name: string;
  slug: string;
  startDate: string | null;
  endDate: string | null;
  lifecycle: "draft" | "active" | "closed";
};
export type StructureItem = {
  id: string;
  name: string;
  slug: string;
  accentColor: string;
  iconKey: string;
};
