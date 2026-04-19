import { describe, expect, it } from "vitest";

import * as backend from "../index.js";

describe("backend index exports", () => {
  it("re-exports core service functions", () => {
    expect(typeof backend.getThemeBySchoolCode).toBe("function");
    expect(typeof backend.getListingById).toBe("function");
    expect(typeof backend.getProfile).toBe("function");
    expect(typeof backend.createConversation).toBe("function");
    expect(typeof backend.signUpWithEmail).toBe("function");
    expect(typeof backend.getWishlist).toBe("function");
    expect(typeof backend.getNotifications).toBe("function");
    expect(typeof backend.createReport).toBe("function");
    expect(typeof backend.getCategories).toBe("function");
    expect(typeof backend.blockUser).toBe("function");
  });
});
