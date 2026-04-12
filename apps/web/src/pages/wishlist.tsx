import { getListingImageUrl, getListingWithDetails } from "@campus-marketplace/backend";
import type { ListingWithDetails } from "@campus-marketplace/backend";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { SessionUser } from "../features/types.ts";

type OutletContext = {
    user: SessionUser | null;
    openPostForm: () => void;
};

const getStoredWishlistIds = (): string[] => {
    const raw = localStorage.getItem("wishlist");
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter((id): id is string => typeof id === "string" && id.trim() !== "");
    }
    catch {
        return [];
    }
};

export default function Wishlist() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useOutletContext<OutletContext>();
    const [wishlistIds, setWishlistIds] = useState<string[]>(() => getStoredWishlistIds());
    const [listingsData, setListingsData] = useState<Array<ListingWithDetails>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            navigate("/login");
            return;
        }
        setWishlistIds(getStoredWishlistIds());
    }, [user, navigate]);

    useEffect(() => {
        const loadWishlistListings = async () => {
            if (!user) {
                return;
            }

            if (wishlistIds.length === 0) {
                setListingsData([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const results = await Promise.all(
                    wishlistIds.map(async (id) => {
                        try {
                            return await getListingWithDetails(id);
                        }
                        catch {
                            return null;
                        }
                    }),
                );

                const validListings = results.filter((listing): listing is ListingWithDetails => listing !== null);
                setListingsData(validListings);
            }
            finally {
                setLoading(false);
            }
        };

        void loadWishlistListings();
    }, [user, wishlistIds]);

    const handleRemove = (id: string) => {
        const updatedWishlist = wishlistIds.filter((wishlistId) => wishlistId !== id);
        localStorage.setItem("wishlist", JSON.stringify(updatedWishlist));
        setWishlistIds(updatedWishlist);
    };

    return (
        <section className="p-6 sm:p-8">
            <div className="mx-auto max-w-7xl">
                <h1 className="mb-6 text-2xl font-bold">Your Wishlist</h1>

                {loading && listingsData.length > 0 && (
                    <p className="mb-4 text-sm font-medium text-black/70">Updating wishlist...</p>
                )}

                {!loading && listingsData.length === 0 ? (
                    <p>Your wishlist is empty.</p>
                ) : listingsData.length > 0 ? (
                    <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
                        {loading && listingsData.length > 0 && (
                            <div className="pointer-events-none absolute inset-0 rounded-xl bg-white/20" aria-hidden="true" />
                        )}

                        {listingsData.map((listing) => (
                            <div key={listing.id} className="relative">
                                <button
                                    type="button"
                                    aria-label="Remove from wishlist"
                                    className="absolute right-3 top-3 z-10 rounded-full border border-black/15 bg-white px-3 py-1 text-xs font-semibold text-black shadow-sm transition hover:opacity-85"
                                    onClick={() => handleRemove(listing.id)}
                                >
                                    Delete
                                </button>

                                <Link
                                    to={`/listing/${listing.id}`}
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
                                            {listing.images?.[0]?.path ? (
                                                <img
                                                    src={getListingImageUrl(listing.images[0].path)}
                                                    alt={listing.images?.[0]?.alt_text ?? listing.title}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-3xl">📷</span>
                                            )}
                                        </div>

                                        <p className="text-lg font-bold leading-tight">{listing.title}</p>

                                        <div className="mt-2 flex justify-between text-sm">
                                            <span className="font-semibold">
                                                {listing.price_unit ?? "$"}
                                                {listing.price ?? "0"}
                                            </span>
                                            <span className="text-gray-700">
                                                {listing.category_name ?? "N/A"}
                                            </span>
                                        </div>

                                        <div className="mt-2 flex justify-between text-xs text-gray-700">
                                            <span>
                                                {listing.type === "item"
                                                    ? listing.item_details?.condition || "N/A"
                                                    : "Service"}
                                            </span>
                                            <span>{listing.created_at?.split("T")[0] ?? "N/A"}</span>
                                        </div>

                                        <div
                                            className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold text-[var(--color-text-on-primary)]"
                                            style={{ backgroundColor: "var(--color-primary)" }}
                                        >
                                            {listing.status === "active" ? "✓ PUBLISHED" : "📝 DRAFT"}
                                        </div>
                                    </article>
                                </Link>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>Loading...</p>
                )}
            </div>
        </section>
    );
}