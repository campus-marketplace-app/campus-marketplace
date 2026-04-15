import { getListingImageUrl, getWishlist, removeFromWishlist } from "@campus-marketplace/backend";
import type { WishlistItemWithListing } from "@campus-marketplace/backend";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { SessionUser } from "../features/types.ts";

type OutletContext = {
    user: SessionUser | null;
    openPostForm: () => void;
};

/** Badge label and color for each unavailability state. */
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
    const [wishlistItems, setWishlistItems] = useState<WishlistItemWithListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            // Only redirect if there are no stored tokens — if tokens exist,
            // the session is still being restored asynchronously by the layout.
            const hasTokens = !!localStorage.getItem("access_token") && !!localStorage.getItem("refresh_token");
            if (!hasTokens) {
                navigate("/login");
            }
        }
    }, [user, navigate]);

    useEffect(() => {
        if (!user) {
            return;
        }

        const loadWishlist = async () => {
            setLoading(true);
            setError(null);
            try {
                const items = await getWishlist(user.id);
                setWishlistItems(items);
            }
            catch (err) {
                console.error("Failed to load wishlist:", err);
                setError(err instanceof Error ? err.message : "Failed to load wishlist");
            }
            finally {
                setLoading(false);
            }
        };

        void loadWishlist();
    }, [user]);

    const handleRemove = async (wishlistItemId: string, listingId: string) => {
        if (!user) {
            return;
        }

        try {
            await removeFromWishlist(user.id, listingId);
            setWishlistItems(prev => prev.filter(i => i.id !== wishlistItemId));
        }
        catch {
            // Optimistic removal failed — re-fetch to sync state.
            const items = await getWishlist(user.id);
            setWishlistItems(items);
        }
    };

    return (
        <section className="p-6 sm:p-8">
            <div className="mx-auto max-w-7xl">
                <h1 className="mb-6 text-2xl font-bold">Your Wishlist</h1>

                {error && (
                    <p className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">{error}</p>
                )}

                {loading && wishlistItems.length > 0 && (
                    <p className="mb-4 text-sm font-medium text-black/70">Updating wishlist...</p>
                )}

                {!loading && wishlistItems.length === 0 ? (
                    <p>Your wishlist is empty.</p>
                ) : wishlistItems.length > 0 ? (
                    <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
                        {loading && wishlistItems.length > 0 && (
                            <div className="pointer-events-none absolute inset-0 rounded-xl bg-white/20" aria-hidden="true" />
                        )}

                        {wishlistItems.map((item) => {
                            const listing = item.listing;
                            const isUnavailable = item.availability !== "available";
                            const unavailabilityLabel = UNAVAILABILITY_LABELS[item.availability];

                            return (
                                <div key={item.id} className={`relative${isUnavailable ? " opacity-70" : ""}`}>
                                    <button
                                        type="button"
                                        aria-label="Remove from wishlist"
                                        className="absolute right-3 top-3 z-10 rounded-full border border-black/15 bg-white px-3 py-1 text-xs font-semibold text-black shadow-sm transition hover:opacity-85"
                                        onClick={() => void handleRemove(item.id, item.listing_id)}
                                    >
                                        Delete
                                    </button>

                                    <Link
                                        to={`/listing/${item.listing_id}`}
                                        state={{ backgroundLocation: location }}
                                        className="block rounded-xl transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-black"
                                    >
                                        <article
                                            className="rounded-xl border p-4 text-left text-black shadow-sm"
                                            style={{
                                                background: "linear-gradient(180deg, color-mix(in srgb, var(--color-secondary) 26%, white), white)",
                                                borderColor: "color-mix(in srgb, var(--color-primary) 30%, white)",
                                            }}
                                        >
                                            <div className="mb-3 flex h-32 w-full items-center justify-center overflow-hidden rounded-lg bg-[var(--color-secondary)] text-xs text-black">
                                                {listing?.first_image_path ? (
                                                    <img
                                                        src={getListingImageUrl(listing.first_image_path)}
                                                        alt={listing.first_image_alt ?? listing.title}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-3xl">📷</span>
                                                )}
                                            </div>

                                            <p className="text-lg font-bold leading-tight">
                                                {listing?.title ?? "Listing unavailable"}
                                            </p>

                                            <div className="mt-2 flex justify-between text-sm">
                                                <span className="font-semibold">
                                                    {listing
                                                        ? `${listing.price_unit ?? "$"}${listing.price ?? "0"}`
                                                        : "—"}
                                                </span>
                                                <span className="text-gray-700">
                                                    {listing?.category_name ?? "N/A"}
                                                </span>
                                            </div>

                                            <div className="mt-2 flex justify-between text-xs text-gray-700">
                                                <span>
                                                    {listing?.type === "service" ? "Service" : "Item"}
                                                </span>
                                                <span>{item.created_at?.split("T")[0] ?? "N/A"}</span>
                                            </div>

                                            {/* Availability badge */}
                                            <div
                                                className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold"
                                                style={
                                                    isUnavailable
                                                        ? { backgroundColor: "#e5e7eb", color: "#374151" }
                                                        : { backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary)" }
                                                }
                                            >
                                                {isUnavailable ? `✕ ${unavailabilityLabel}` : "✓ Available"}
                                            </div>
                                        </article>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p>Loading...</p>
                )}
            </div>
        </section>
    );
}
