import { createClient } from "@supabase/supabase-js";

// These values are read at runtime from backend environment variables.
// They should be defined in apps/backend/.env.local and never committed.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Fail fast during startup if credentials are missing.
// This prevents unclear runtime errors later when service functions query Supabase.
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local",
  );
}

// Single shared Supabase client used by backend service modules.
// Frontend should never import this directly.
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
