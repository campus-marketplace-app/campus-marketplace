// Reports service module.
// Manages rows in public.reports for user-submitted content reports.

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

// Submit a report against a listing or a user.
// Exactly one of reportedListingId / reportedUserId must be provided (not both, not neither).
export async function createReport(
  _reporterId: string,
  _reportedListingId: string | null,
  _reportedUserId: string | null,
  _reason: string,
  _details?: string,
): Promise<Report> {
  void _reporterId;
  void _reportedListingId;
  void _reportedUserId;
  void _reason;
  void _details;
  throw new Error("Not yet implemented");
}
