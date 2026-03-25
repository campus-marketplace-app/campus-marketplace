import { createClient } from "@supabase/supabase-js";

const isBrowser =
  typeof globalThis !== "undefined" && "window" in globalThis;

const viteEnv = (
  import.meta as ImportMeta & { env?: Record<string, string | undefined> }
).env;

// Direct-import support:
// Browser bundle reads Vite public vars; Node runtime reads backend vars.
const supabaseUrl = isBrowser
  ? viteEnv?.VITE_SUPABASE_URL
  : process.env.SUPABASE_URL;
const supabaseKey = isBrowser
  ? viteEnv?.VITE_SUPABASE_ANON_KEY
  : process.env.SUPABASE_SERVICE_KEY;

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