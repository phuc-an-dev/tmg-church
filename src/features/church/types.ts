export interface ChurchViewModel {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  ministryCount: number;
  memberCount: number;
  segmentCount: number;
  isDeletable: boolean;
}

export interface ChurchSummaryItem {
  id: string;
  name: string;
  slug: string;
}

export type ChurchState =
  | { status: "zero" }
  | { status: "one"; church: ChurchViewModel }
  | { status: "multiple"; count: number; churches: ChurchSummaryItem[] };

export type ActionResult<T = unknown> =
  | {
      success: true;
      data: T;
      message?: string;
    }
  | {
      success: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[]>;
    };
