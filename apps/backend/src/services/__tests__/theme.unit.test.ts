import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryResponse = {
  data?: unknown;
  error?: { message: string } | null;
};

const { state, supabaseMock } = vi.hoisted(() => {
  const mockState = {
    response: { data: null, error: null } as QueryResponse,
  };

  const chain = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({
      data: mockState.response.data ?? null,
      error: mockState.response.error ?? null,
    }),
  };

  return {
    state: mockState,
    supabaseMock: {
      from: () => chain,
    },
  };
});

vi.mock("../../supabase-client.js", () => ({
  supabase: supabaseMock,
}));

import { getThemeBySchoolCode } from "../theme.js";

describe("theme service unit", () => {
  beforeEach(() => {
    state.response = { data: null, error: null };
    vi.restoreAllMocks();
  });

  it("returns theme data for a valid school code", async () => {
    state.response = {
      data: {
        school_code: 123456,
        school_name: "Test University",
        primary_color: "#111111",
        secondary_color: "#222222",
      },
      error: null,
    };

    const theme = await getThemeBySchoolCode(123456);

    expect(theme.school_code).toBe(123456);
    expect(theme.school_name).toBe("Test University");
  });

  it("throws with school-code context when query fails", async () => {
    state.response = {
      data: null,
      error: { message: "theme lookup failed" },
    };

    await expect(getThemeBySchoolCode(999999)).rejects.toThrow(
      'Failed to fetch theme for school code "999999": theme lookup failed',
    );
  });
});
