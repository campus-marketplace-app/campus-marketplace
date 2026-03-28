// Reports service module.
// Manages rows in public.reports for user-submitted content reports.

import { supabase } from "../supabase-client.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReportStatus = "pending" | "in_review" | "resolved" | "dismissed";

export interface Report {
  // Exactly one of reported_listing_id / reported_user_id will be non-null.
  id: string;
  reporter_id: string;
  reported_listing_id: string | null;
  reported_user_id: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

const reportSelect =
  "id,reporter_id,reported_listing_id,reported_user_id,reason,details,status,created_at,updated_at";

// Submit a report against a listing or a user.
// Exactly one of reportedListingId / reportedUserId must be provided (not both, not neither).
// The DB has a reports_target_check constraint enforcing this too.
export async function createReport(
  reporterId: string,
  reportedListingId: string | null,
  reportedUserId: string | null,
  reason: string,
  details?: string,
): Promise<Report> {
  if (!reporterId.trim()) {
    throw new Error("Reporter ID is required");
  }
  if (!reason.trim()) {
    throw new Error("Reason is required");
  }

  // Exactly one target must be set.
  const hasListing = reportedListingId !== null && reportedListingId.trim() !== "";
  const hasUser = reportedUserId !== null && reportedUserId.trim() !== "";

  if (hasListing && hasUser) {
    throw new Error("Provide either a listing or a user to report, not both");
  }
  if (!hasListing && !hasUser) {
    throw new Error("Provide either a listing or a user to report");
  }

  // If reporting a listing, make sure it exists.
  if (hasListing) {
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id")
      .eq("id", reportedListingId!)
      .is("deleted_at", null)
      .single();

    if (listingError || !listing) {
      throw new Error("Reported listing not found or has been deleted");
    }
  }

  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: reporterId,
      reported_listing_id: hasListing ? reportedListingId : null,
      reported_user_id: hasUser ? reportedUserId : null,
      reason: reason.trim(),
      details: details?.trim() || null,
    })
    .select(reportSelect)
    .single<Report>();

  if (error) {
    throw new Error(`Failed to create report: ${error.message}`);
  }

  if (!data) {
    throw new Error("Create report did not return data");
  }

  return data;
}
