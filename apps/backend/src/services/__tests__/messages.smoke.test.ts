import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { supabase } from "../../supabase-client.js";
import { testEmail } from "./helpers.js";

interface AuthedUser {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const supabaseUrl = requireEnv("SUPABASE_URL");
loadEnv({ path: resolve(process.cwd(), "../web/.env.local") });
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  throw new Error("Missing SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY) in apps/backend/.env.local");
}

function createAnonClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function createAuthedUser(label: string): Promise<AuthedUser> {
  const email = testEmail();
  const password = `TestPass!${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: label },
  });

  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message ?? "unknown error"}`);
  }

  const client = createAnonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });

  if (signInError) {
    throw new Error(`Failed to sign in test user: ${signInError.message}`);
  }

  return {
    id: data.user.id,
    email,
    password,
    client,
  };
}

describe.sequential("CM-US-047 messaging schema + RLS smoke", () => {
  let userA: AuthedUser | null = null;
  let userB: AuthedUser | null = null;
  let userC: AuthedUser | null = null;
  let conversationId: string | null = null;

  beforeAll(async () => {
    userA = await createAuthedUser("Messages Smoke A");
    userB = await createAuthedUser("Messages Smoke B");
    userC = await createAuthedUser("Messages Smoke C");

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert({ listing_id: null })
      .select("id")
      .single();

    if (conversationError || !conversation) {
      throw new Error(`Failed to create conversation: ${conversationError?.message ?? "unknown error"}`);
    }

    conversationId = conversation.id;

    const { error: participantError } = await supabase.from("conversation_participants").insert([
      { conversation_id: conversationId, user_id: userA.id },
      { conversation_id: conversationId, user_id: userB.id },
    ]);

    if (participantError) {
      throw new Error(`Failed to add participants: ${participantError.message}`);
    }

    const { error: seedMessageError } = await userA.client.from("messages").insert({
      conversation_id: conversationId,
      sender_id: userA.id,
      content: "seed message",
    });

    if (seedMessageError) {
      throw new Error(`Failed to seed message: ${seedMessageError.message}`);
    }
  });

  afterAll(async () => {
    if (conversationId) {
      await supabase.from("conversations").delete().eq("id", conversationId);
    }

    for (const user of [userA, userB, userC]) {
      if (!user) continue;
      await supabase.auth.admin.deleteUser(user.id);
    }
  });

  it("has required messaging tables available", async () => {
    const { error: conversationsError } = await supabase.from("conversations").select("id").limit(1);
    const { error: participantsError } = await supabase.from("conversation_participants").select("id").limit(1);
    const { error: messagesError } = await supabase.from("messages").select("id").limit(1);

    expect(conversationsError).toBeNull();
    expect(participantsError).toBeNull();
    expect(messagesError).toBeNull();
  });

  it("enforces participants unique constraint (conversation_id, user_id)", async () => {
    if (!conversationId || !userA) throw new Error("Test setup incomplete");

    const { error } = await supabase.from("conversation_participants").insert({
      conversation_id: conversationId,
      user_id: userA.id,
    });

    expect(error).toBeTruthy();
    expect(error?.code).toBe("23505");
  });

  it("enforces conversations FK constraint for listing_id", async () => {
    const { error } = await supabase.from("conversations").insert({
      listing_id: randomUUID(),
    });

    expect(error).toBeTruthy();
    expect(error?.code).toBe("23503");
  });

  it("enforces participants FK constraint for user_id", async () => {
    if (!conversationId) throw new Error("Test setup incomplete");

    const { error } = await supabase.from("conversation_participants").insert({
      conversation_id: conversationId,
      user_id: randomUUID(),
    });

    expect(error).toBeTruthy();
    expect(error?.code).toBe("23503");
  });

  it("enforces messages FK constraint for conversation_id", async () => {
    if (!userA) throw new Error("Test setup incomplete");

    const { error } = await supabase.from("messages").insert({
      conversation_id: randomUUID(),
      sender_id: userA.id,
      content: "fk check",
    });

    expect(error).toBeTruthy();
    expect(error?.code).toBe("23503");
  });

  it("enforces messages FK constraint for sender_id", async () => {
    if (!conversationId) throw new Error("Test setup incomplete");

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: randomUUID(),
      content: "sender fk check",
    });

    expect(error).toBeTruthy();
    expect(error?.code).toBe("23503");
  });

  it("allows participants to read messages", async () => {
    if (!conversationId || !userA) throw new Error("Test setup incomplete");

    const { data, error } = await userA.client
      .from("messages")
      .select("id,conversation_id,sender_id,content")
      .eq("conversation_id", conversationId);

    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("denies non-participants from reading messages", async () => {
    if (!conversationId || !userC) throw new Error("Test setup incomplete");

    const { data, error } = await userC.client
      .from("messages")
      .select("id,conversation_id,sender_id,content")
      .eq("conversation_id", conversationId);

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("allows participant insert when sender_id matches auth.uid()", async () => {
    if (!conversationId || !userB) throw new Error("Test setup incomplete");

    const { data, error } = await userB.client
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userB.id,
        content: "valid participant insert",
      })
      .select("id,sender_id")
      .single();

    expect(error).toBeNull();
    expect(data?.sender_id).toBe(userB.id);
  });

  it("rejects spoofed sender_id on insert", async () => {
    if (!conversationId || !userA || !userB) throw new Error("Test setup incomplete");

    const { data, error } = await userA.client
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userB.id,
        content: "spoof attempt",
      })
      .select("id")
      .single();

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error?.message.toLowerCase()).toContain("row-level security policy");
  });

  it("rejects insert by non-participant", async () => {
    if (!conversationId || !userC) throw new Error("Test setup incomplete");

    const { data, error } = await userC.client
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userC.id,
        content: "non-participant insert",
      })
      .select("id")
      .single();

    expect(data).toBeNull();
    expect(error).toBeTruthy();
    expect(error?.message.toLowerCase()).toContain("row-level security policy");
  });
});
