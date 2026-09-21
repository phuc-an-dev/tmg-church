import { describe, expect, test } from "vitest";
import { parseMemberImport } from "./member-import";

describe("parseMemberImport", () => {
  test("normalizes ISO dates and legacy years while skipping impossible dates", () => {
    const result = parseMemberImport(`Full Name,Date of birth,Gender
Jane Doe,2000-02-29,female
John Doe,1985,male
Invalid Date,2025-02-29,male`);

    expect(result).toEqual({
      valid: [
        {
          fullName: "Jane Doe",
          phone: null,
          dateOfBirth: "2000-02-29",
          gender: "female",
        },
        {
          fullName: "John Doe",
          phone: null,
          dateOfBirth: "1985-01-01",
          gender: "male",
        },
      ],
      skipped: 1,
    });
  });

  test("accepts date-of-birth JSON aliases", () => {
    expect(
      parseMemberImport(
        JSON.stringify([
          { full_name: "Jane Doe", date_of_birth: "2000-02-29" },
        ]),
      ),
    ).toEqual({
      valid: [
        {
          fullName: "Jane Doe",
          phone: null,
          dateOfBirth: "2000-02-29",
          gender: null,
        },
      ],
      skipped: 0,
    });
  });

  test("preserves accented Vietnamese CSV headers", () => {
    expect(
      parseMemberImport(
        "Họ và tên,Số điện thoại,Năm sinh,Giới tính\nNguyễn An,0901234567,1985,Nam",
      ),
    ).toEqual({
      valid: [
        {
          fullName: "Nguyễn An",
          phone: "0901234567",
          dateOfBirth: "1985-01-01",
          gender: "male",
        },
      ],
      skipped: 0,
    });
  });

  test("accepts legacy export, Tên, and Sex aliases", () => {
    expect(
      parseMemberImport(
        "Full Name,Phone,Birth Year,Gender\nJane Doe,0901234567,1985,female",
      ),
    ).toEqual({
      valid: [
        {
          fullName: "Jane Doe",
          phone: "0901234567",
          dateOfBirth: "1985-01-01",
          gender: "female",
        },
      ],
      skipped: 0,
    });
    expect(parseMemberImport("Tên,Sex\nNguyễn Bình,M")).toEqual({
      valid: [
        {
          fullName: "Nguyễn Bình",
          phone: null,
          dateOfBirth: null,
          gender: "male",
        },
      ],
      skipped: 0,
    });
  });
});
