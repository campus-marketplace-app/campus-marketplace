import { supabase } from "../supabase-client.js";

export interface HomeStats {
  activeListings: number;
  activeUsers: number;
  newToday: number;
}

/** Fetches three aggregate counts for the homepage stats banner. Runs in parallel. */
export async function getHomeStats(): Promise<HomeStats> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [listingsResult, newTodayResult, usersResult] = await Promise.all([
    supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .is("deleted_at", null),

    supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .is("deleted_at", null)
      .gte("created_at", todayISO),

    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true }),
  ]);

  if (listingsResult.error) {
    throw new Error(`Failed to count active listings: ${listingsResult.error.message}`);
  }
  if (newTodayResult.error) {
    throw new Error(`Failed to count today's listings: ${newTodayResult.error.message}`);
  }
  if (usersResult.error) {
    throw new Error(`Failed to count users: ${usersResult.error.message}`);
  }

  return {
    activeListings: listingsResult.count ?? 0,
    newToday: newTodayResult.count ?? 0,
    activeUsers: usersResult.count ?? 0,
  };
}
