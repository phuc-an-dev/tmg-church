export interface MemberItem {
  id: string;
  fullName: string;
  phone: string | null;
  birthYear: number | null;
}

export interface MemberPageResult {
  items: MemberItem[];
  count: number;
  page: number;
  pageSize: number;
}

export type MemberActionResult =
  | {
      success: true;
      data: MemberItem;
      message: string;
    }
  | {
      success: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[]>;
    };
