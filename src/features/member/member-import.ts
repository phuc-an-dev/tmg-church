import { createMemberSchema } from "./schemas";

export interface ImportedMember {
  fullName: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: "female" | "male" | null;
}

export interface MemberImportResult {
  valid: ImportedMember[];
  skipped: number;
}

const nameHeaders = [
  "fullname",
  "full_name",
  "full name",
  "name",
  "tên",
  "họ và tên",
  "họ tên",
  "ho ten",
];
function value(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const candidate = item[key];
    if (candidate !== undefined && candidate !== null && candidate !== "") {
      return candidate;
    }
  }
  return null;
}

function normalizeGender(value: unknown): "female" | "male" | null {
  const raw = String(value ?? "").toLowerCase();
  if (raw.includes("fe") || raw.includes("nữ") || raw === "f" || raw === "nu") {
    return "female";
  }
  if (raw.includes("ma") || raw.includes("nam") || raw === "m") return "male";
  return null;
}

function normalizeDateOfBirth(value: unknown, legacyYear: unknown) {
  if (value !== null && value !== undefined && value !== "") {
    const date = String(value).trim();
    return /^\d{4}$/.test(date) ? `${date}-01-01` : date;
  }
  const year = String(legacyYear ?? "").trim();
  return /^\d{4}$/.test(year) ? `${year}-01-01` : null;
}

function toMember(item: Record<string, unknown>): ImportedMember | null {
  const normalized = Object.fromEntries(
    Object.entries(item).map(([key, value]) => [
      key.trim().toLowerCase(),
      value,
    ]),
  );
  const fullName = String(
    value(normalized, [
      "fullname",
      "full_name",
      "full name",
      "name",
      "ten",
      "ho_ten",
      "họ và tên",
      "họ tên",
      "ho ten",
    ]) ?? "",
  ).trim();
  const rawPhone = value(normalized, [
    "phone",
    "sdt",
    "so_dien_thoai",
    "số điện thoại",
    "so dien thoai",
  ]);
  const phone = rawPhone ? String(rawPhone).trim() : null;
  const dateOfBirth = normalizeDateOfBirth(
    value(normalized, [
      "dateofbirth",
      "date_of_birth",
      "date of birth",
      "birthdate",
      "birth_date",
      "dob",
      "ngay_sinh",
      "ngày sinh",
      "ngay sinh",
    ]),
    value(normalized, [
      "birthyear",
      "birth_year",
      "year",
      "nam_sinh",
      "năm sinh",
      "nam sinh",
    ]),
  );
  const gender = normalizeGender(
    value(normalized, ["gender", "gioi_tinh", "giới tính", "gioi tinh"]),
  );
  const parsed = createMemberSchema.safeParse({
    fullName,
    phone: phone ?? "",
    dateOfBirth,
    gender,
  });
  return parsed.success ? { fullName, phone, dateOfBirth, gender } : null;
}

function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const columns = lines[0]
    .split(/[,;\t]/)
    .map((column) => column.replace(/^["']|["']$/g, "").trim());
  const normalizedHeaders = columns.map((column) => column.toLowerCase());
  const hasHeader = normalizedHeaders.some((column) =>
    nameHeaders.includes(column),
  );
  if (!hasHeader) {
    return lines.map((line) => {
      const [fullName = "", phone = "", dateOfBirth = "", gender = ""] = line
        .split(/[,;\t]/)
        .map((column) => column.replace(/^["']|["']$/g, "").trim());
      return { fullName, phone, dateOfBirth, gender };
    });
  }
  return lines.slice(1).map((line) => {
    const cells = line
      .split(/[,;\t]/)
      .map((column) => column.replace(/^["']|["']$/g, "").trim());
    return Object.fromEntries(
      columns.map((column, index) => [column, cells[index] ?? ""]),
    );
  });
}

export function parseMemberImport(text: string): MemberImportResult {
  const trimmed = text.trim();
  if (!trimmed) return { valid: [], skipped: 0 };
  let rows: Record<string, unknown>[];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const list = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === "object" &&
          Array.isArray((parsed as { members?: unknown }).members)
        ? (parsed as { members: unknown[] }).members
        : [];
    rows = list.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
    );
  } catch {
    rows = parseCsv(trimmed);
  }
  const valid: ImportedMember[] = [];
  let skipped = 0;
  for (const row of rows) {
    const member = toMember(row);
    if (member) valid.push(member);
    else skipped += 1;
  }
  return { valid, skipped };
}
