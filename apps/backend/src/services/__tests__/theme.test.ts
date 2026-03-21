import { describe, it, expect } from "vitest";
import { getThemeBySchoolCode } from "../theme.js";

// If VITE_SCHOOL_CODE is not set, these tests are skipped.
const schoolCodeStr = process.env.VITE_SCHOOL_CODE;
const schoolCode = schoolCodeStr ? parseInt(schoolCodeStr, 10) : null;


describe("getThemeBySchoolCode", () => {
  it("returns SchoolTheme with required fields for a valid school code", async () => {
    if (!schoolCode) {
      console.warn("VITE_SCHOOL_CODE not set — skipping valid school code test");
      return;
    }

    const theme = await getThemeBySchoolCode(schoolCode);

    expect(theme.school_code).toBe(schoolCode);
    expect(theme.school_name).toBeTruthy();
    expect(theme.primary_color).toBeTruthy();
    expect(theme.secondary_color).toBeTruthy();
  });

  it("throws for a nonexistent school code", async () => {
    // Use a code that cannot exist (negative number)
    await expect(getThemeBySchoolCode(-1)).rejects.toThrow();
  });
});
