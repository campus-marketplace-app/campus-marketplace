import { supabase } from "../../supabase-client.js";
import { signUpWithEmail } from "../auth.js";
import { createListing, deleteListing } from "../listings.js";
import type { Listing, CreateListingInput } from "../listings.types.js";
import type { AuthResult } from "../auth.js";

/** Generates a unique .edu test email. */
export function testEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 7);
  return `test-${timestamp}-${random}@test.edu`;
}

export interface TestUser {
  user: AuthResult["user"];
  session: AuthResult["session"];
  cleanup: () => Promise<void>;
}

/** Creates a test auth user and returns cleanup function that deletes it. */
export async function createTestUser(displayName = "Test User"): Promise<TestUser> {
  const email = testEmail();
  const password = "TestPassword123!";

  const isRateLimitError = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message : String(error);
    return message.toLowerCase().includes("request rate limit reached");
  };

  let result: AuthResult;

  try {
    result = await signUpWithEmail({
      email,
      password,
      display_name: displayName,
    });
  } catch (error) {
    if (!isRateLimitError(error)) {
      throw error;
    }

    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

    if (adminError || !adminData.user) {
      throw new Error(`Failed to create test user via admin API: ${adminError?.message ?? "unknown error"}`);
    }

    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      throw new Error(`Failed to sign in test user via admin fallback: ${signInError.message}`);
    }

    result = {
      user: adminData.user,
      session: sessionData.session ?? null,
    };
  }

  const cleanup = async () => {
    try {
      await supabase.auth.admin.deleteUser(result.user.id);
    } catch {
      // Ignore cleanup errors to avoid masking test failures
    }
  };

  return { user: result.user, session: result.session, cleanup };
}

/** Creates a test listing for a given user. */
export async function createTestListing(
  userId: string,
  overrides: Partial<CreateListingInput> = {},
): Promise<Listing> {
  return createListing({
    user_id: userId,
    title: "Test Listing",
    description: "A test listing description",
    ...overrides,
  });
}

/** Deletes a test listing by id and userId. */
export async function deleteTestListing(id: string, userId: string): Promise<void> {
  await deleteListing(id, userId);
}
