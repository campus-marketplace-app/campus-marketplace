import { describe, expect, it, vi } from "vitest";

type QueryResponse = {
  table: string;
  operation: string;
  data: unknown;
  error: { message: string } | null;
};

const { responses, from } = vi.hoisted(() => {
  const mockResponses: QueryResponse[] = [];
  const mockFrom = vi.fn((table: string) => createChain(table));

  return {
    responses: mockResponses,
    from: mockFrom,
  };
});

function enqueueResponse(response: QueryResponse) {
  responses.push(response);
}

function nextResponse(table: string, operation: string) {
  const response = responses.shift();

  if (!response) {
    throw new Error(`Unexpected query for ${table}.${operation}`);
  }

  expect(response.table).toBe(table);
  expect(response.operation).toBe(operation);

  return { data: response.data, error: response.error };
}

function createChain(table: string) {
  let operation = "select";
  const chain: Record<string, unknown> = {};

  chain.select = () => {
    if (operation === "select") {
      operation = "select";
    }
    return chain;
  };
  chain.eq = () => chain;
  chain.is = () => chain;
  chain.insert = () => {
    operation = "insert";
    return chain;
  };
  chain.single = async () => nextResponse(table, operation);

  return chain as {
    select: () => unknown;
    eq: () => unknown;
    is: () => unknown;
    insert: () => unknown;
    single: () => Promise<{ data: unknown; error: { message: string } | null }>;
  };
}

vi.mock("../../supabase-client.js", () => ({
  supabase: { from },
}));

import { createReport } from "../reports.js";

describe("reports service", () => {
  it("creates a report against a listing", async () => {
    enqueueResponse({ table: "listings", operation: "select", data: { id: "listing-1" }, error: null });
    enqueueResponse({
      table: "reports",
      operation: "insert",
      data: {
        id: "report-1",
        reporter_id: "reporter-1",
        reported_listing_id: "listing-1",
        reported_user_id: null,
        reason: "Spam",
        details: "Looks suspicious",
        status: "pending",
        created_at: "2026-04-14T00:00:00.000Z",
        updated_at: "2026-04-14T00:00:00.000Z",
      },
      error: null,
    });

    const report = await createReport("reporter-1", "listing-1", null, "Spam", "Looks suspicious");

    expect(report.reported_listing_id).toBe("listing-1");
    expect(report.reported_user_id).toBeNull();
    expect(report.status).toBe("pending");
  });

  it("creates a report against a user", async () => {
    enqueueResponse({
      table: "reports",
      operation: "insert",
      data: {
        id: "report-2",
        reporter_id: "reporter-1",
        reported_listing_id: null,
        reported_user_id: "user-2",
        reason: "Harassment",
        details: null,
        status: "pending",
        created_at: "2026-04-14T00:00:00.000Z",
        updated_at: "2026-04-14T00:00:00.000Z",
      },
      error: null,
    });

    const report = await createReport("reporter-1", null, "user-2", "Harassment");

    expect(report.reported_listing_id).toBeNull();
    expect(report.reported_user_id).toBe("user-2");
    expect(report.reason).toBe("Harassment");
  });

  it("throws when target validation fails", async () => {
    await expect(createReport("", "listing-1", null, "Spam")).rejects.toThrow("Reporter ID is required");
    await expect(createReport("reporter-1", null, null, "Spam")).rejects.toThrow(
      "Provide either a listing or a user to report",
    );
    await expect(createReport("reporter-1", "listing-1", "user-2", "Spam")).rejects.toThrow(
      "Provide either a listing or a user to report, not both",
    );
    await expect(createReport("reporter-1", null, "user-2", "")).rejects.toThrow("Reason is required");
  });
});