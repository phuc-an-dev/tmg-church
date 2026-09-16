export interface FrequentIconItem {
  id: string;
  name: string;
  displayOrder: number;
}

export interface IconActionResult<T = undefined> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
}
