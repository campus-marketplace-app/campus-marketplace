import { useState } from "react";
import { ChevronDown } from "lucide-react";

type ManagementPanelProps = {
  status: "draft" | "active" | "sold";
  onStatusChange: (status: "draft" | "active" | "sold") => void;
  onEdit: () => void;
  onDelete: () => void;
  publishLoading: boolean;
  deleteLoading: boolean;
  soldLoading: boolean;
  statusLocked: boolean;
};

export function ListingManagementPanel({
  status,
  onStatusChange,
  onEdit,
  onDelete,
  publishLoading,
  deleteLoading,
  soldLoading,
  statusLocked,
}: ManagementPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusBusy = publishLoading || soldLoading;
  const statusLabels = {
    draft: "Draft",
    active: "Published",
    sold: "Completed",
  };

  const statusDescriptions = {
    draft: "Hidden from buyers",
    active: "Visible to all",
    sold: "Archived & locked",
  };

  return (
    <div
      className="overflow-hidden rounded-xl border transition-all duration-300"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: isExpanded ? "var(--color-background)" : "var(--color-surface)",
      }}
    >
      {/* ── Collapsed Header ── */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between transition hover:opacity-85 active:scale-98"
        style={{
          backgroundColor: isExpanded ? "var(--color-background)" : "transparent",
        }}
      >
        <div className="text-left">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
            Manage Listing
          </p>
          <p className="mt-0.5 text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            {statusLabels[status]} • {statusDescriptions[status]}
          </p>
        </div>
        <div
          className="shrink-0 transition-transform duration-300"
          style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <ChevronDown size={20} style={{ color: "var(--color-text-muted)" }} />
        </div>
      </button>

      {/* ── Expanded Content ── */}
      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          maxHeight: isExpanded ? "500px" : "0px",
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="space-y-4 border-t px-4 py-4" style={{ borderColor: "var(--color-border)" }}>
          {/* ── Status Section ── */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
              Status
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["draft", "active", "sold"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={statusBusy || statusLocked || (s === "sold" && status === "draft")}
                  onClick={() => onStatusChange(s)}
                  className="group relative rounded-lg border px-3 py-2.5 text-center text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: status === s ? "var(--color-primary)" : "var(--color-border)",
                    backgroundColor: status === s ? "color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))" : "transparent",
                    color: status === s ? "var(--color-primary)" : "var(--color-text)",
                  }}
                >
                  <span className="inline-block">
                    {statusBusy && status === s ? "..." : statusLabels[s]}
                  </span>
                  <div
                    className="absolute inset-0 rounded-lg opacity-0 transition-opacity group-hover:opacity-100"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--color-primary) 5%, transparent)",
                      pointerEvents: "none",
                    }}
                  />
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              {statusLocked
                ? "Completed listings cannot be reopened."
                : "Draft is hidden • Published is visible • Completed archives the listing"}
            </p>
          </div>

          {/* ── Actions Section ── */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
              Actions
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onEdit}
                className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition hover:opacity-85 active:scale-98"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text)",
                }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleteLoading}
                className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition hover:opacity-85 active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  borderColor: "#ef4444",
                  backgroundColor: "color-mix(in srgb, #ef4444 10%, var(--color-surface))",
                  color: "#dc2626",
                }}
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
