import { createClient } from "@supabase/supabase-js";

const isBrowser =
  typeof globalThis !== "undefined" && "window" in globalThis;

const viteEnv = (
  import.meta as ImportMeta & { env?: Record<string, string | undefined> }
).env;

// Access process via globalThis so Vite doesn't see a bare `process` reference
// when bundling for the browser (where process is undefined).
const nodeProcess = (globalThis as Record<string, unknown>)[
  "process"
] as { env: Record<string, string | undefined> } | undefined;

// Browser bundle reads Vite public vars; Node runtime reads backend vars.
const supabaseUrl = isBrowser
  ? viteEnv?.VITE_SUPABASE_URL
  : nodeProcess?.env?.SUPABASE_URL;
const supabaseKey = isBrowser
  ? viteEnv?.VITE_SUPABASE_ANON_KEY
  : nodeProcess?.env?.SUPABASE_SERVICE_KEY;

// Fail fast during startup if credentials are missing.
// This prevents unclear runtime errors later when service functions query Supabase.
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    isBrowser
      ? "Missing frontend Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in apps/web/.env.local"
      : "Missing backend Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in apps/backend/.env.local",
  );
}

// Single shared Supabase client used by backend service modules.
// Frontend should never import this directly.
export const supabase = createClient(supabaseUrl, supabaseKey);
