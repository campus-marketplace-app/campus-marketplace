import { getListingImageUrl } from "@campus-marketplace/backend";
import type { WishlistItemWithListing } from "@campus-marketplace/backend";
import { useEffect } from "react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { SessionUser } from "../features/types.ts";
import { useWishlist, useRemoveFromWishlist } from "../hooks/useWishlist";

type OutletContext = {
    user: SessionUser | null;
    openPostForm: () => void;
};

/** Badge label for each unavailability state. */
const UNAVAILABILITY_LABELS: Record<string, string> = {
    sold:     "Sold",
    closed:   "Closed",
    archived: "Archived",
    removed:  "Removed",
};

export default function Wishlist() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useOutletContext<OutletContext>();

    const { data: wishlistItems = [], isLoading, error } = useWishlist(user?.id)
    const { mutate: removeItem } = useRemoveFromWishlist()

    useEffect(() => {
        if (!user) {
            const hasTokens = !!localStorage.getItem("access_token") && !!localStorage.getItem("refresh_token");
            if (!hasTokens) {
                navigate("/login");
            }
        }
    }, [user, navigate]);

    const handleRemove = (_wishlistItemId: string, listingId: string) => {
        if (!user) return;
        removeItem({ userId: user.id, listingId });
    };

    return (
        <section className="p-6 sm:p-8">
            <div className="mx-auto max-w-7xl">
                <h1 className="mb-6 text-2xl font-bold" style={{ color: "var(--color-text)" }}>Your Wishlist</h1>

                {error && (
                    <p className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
                        {error instanceof Error ? error.message : "Failed to load wishlist"}
                    </p>
                )}

                {isLoading && wishlistItems.length > 0 && (
                    <p className="mb-4 text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>Updating wishlist...</p>
                )}

                {!isLoading && wishlistItems.length === 0 ? (
                    <div className="flex min-h-[50vh] items-center justify-center px-4">
                        <p className="text-center" style={{ color: "var(--color-text-muted)" }}>Your wishlist is empty.</p>
                    </div>
                ) : wishlistItems.length > 0 ? (
                    <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
                        {isLoading && wishlistItems.length > 0 && (
                            <div className="pointer-events-none absolute inset-0 rounded-xl bg-white/20" aria-hidden="true" />
                        )}

                        {wishlistItems.map((item: WishlistItemWithListing) => {
                            const listing = item.listing;
                            const isUnavailable = item.availability !== "available";
                            const unavailabilityLabel = UNAVAILABILITY_LABELS[item.availability];

                            return (
                                <div key={item.id} className={`relative${isUnavailable ? " opacity-70" : ""}`}>
                                    <button
                                        type="button"
                                        aria-label="Remove from wishlist"
                                        className="absolute right-3 top-3 z-10 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition hover:opacity-85"
                                        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
                                        onClick={() => handleRemove(item.id, item.listing_id)}
                                    >
                                        Delete
                                    </button>

                                    <Link
                                        to={`/listing/${item.listing_id}`}
                                        state={{ backgroundLocation: location }}
                                        className="block rounded-2xl transition hover:-translate-y-0.5 hover:shadow-md"
                                    >
                                        <article
                                            className="overflow-hidden rounded-2xl shadow-sm"
                                            style={{
                                                backgroundColor: "var(--color-surface)",
                                                border: "1px solid var(--color-border)",
                                            }}
                                        >
                                            <div className="relative h-48 w-full" style={{ backgroundColor: "var(--color-background-alt)" }}>
                                                {listing?.first_image_path ? (
                                                    <img
                                                        src={getListingImageUrl(listing.first_image_path)}
                                                        alt={listing.first_image_alt ?? listing.title}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-3xl" style={{ color: "var(--color-text-muted)" }}>📷</div>
                                                )}
                                            </div>

                                            <div className="p-3">
                                                <p className="line-clamp-2 font-semibold leading-snug" style={{ color: "var(--color-text)" }}>
                                                    {listing?.title ?? "Listing unavailable"}
                                                </p>

                                                <p className="mt-1.5 text-base font-bold" style={{ color: "var(--color-primary)" }}>
                                                    {listing
                                                        ? `${listing.price_unit ?? "$"}${listing.price ?? "0"}`
                                                        : "—"}
                                                </p>

                                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                    {listing?.category_name && (
                                                        <span
                                                            className="rounded-md px-2 py-0.5 text-xs font-medium"
                                                            style={{
                                                                backgroundColor: "color-mix(in srgb, var(--color-primary) 15%, var(--color-surface))",
                                                                color: "var(--color-primary)",
                                                            }}
                                                        >
                                                            {listing.category_name}
                                                        </span>
                                                    )}
                                                    <span
                                                        className="rounded-md px-2 py-0.5 text-xs font-medium"
                                                        style={{
                                                            backgroundColor: "color-mix(in srgb, var(--color-primary) 14%, var(--color-surface))",
                                                            color: "var(--color-text)",
                                                        }}
                                                    >
                                                        {listing?.type === "service" ? "Service" : "Item"}
                                                    </span>

                                                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                                                        {item.created_at?.split("T")[0] ?? "N/A"}
                                                    </span>
                                                </div>

                                                {/* Availability badge */}
                                                <div
                                                    className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold"
                                                    style={
                                                        isUnavailable
                                                            ? { backgroundColor: "var(--color-background)", color: "var(--color-text-muted)" }
                                                            : { backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary)" }
                                                    }
                                                >
                                                    {isUnavailable ? `✕ ${unavailabilityLabel}` : "✓ Available"}
                                                </div>
                                            </div>
                                        </article>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p style={{ color: "var(--color-text-muted)" }}>Loading...</p>
                )}
            </div>
        </section>
    );
}
