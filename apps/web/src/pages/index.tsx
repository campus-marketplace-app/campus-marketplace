import { getListingImageUrl } from "@campus-marketplace/backend";
import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { useState } from "react";
import type { ListingWithDetails } from "@campus-marketplace/backend";
import { useSearchListings } from "../hooks/useListings";

type OutletContext = {
    searchQuery: string;
    listingsRefreshKey: number;
};

const PAGE_SIZE = 12;

export default function Index() {
    const location = useLocation();
    const navigate = useNavigate();
    const { searchQuery, listingsRefreshKey } = useOutletContext<OutletContext>();
    const [category, setCategory] = useState<string>("");
    const [listingType, setListingType] = useState<"" | "item" | "service">("");
    const [wishlistToast, setWishlistToast] = useState<string | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    // Build filters — omit empty strings so the cache key stays clean.
    const filters = {
        ...(searchQuery.trim() !== "" && { query: searchQuery.trim() }),
        ...(category !== "" && { category_id: category }),
        ...(listingType !== "" && { type: listingType as "item" | "service" }),
        limit: PAGE_SIZE,
    };

    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useSearchListings(filters);

    // Flatten all cached pages into a single list.
    const listingsData = data?.pages.flatMap((page) => page.listings) ?? [];

    // Show wishlist toast from navigation state.
    // setState here is intentional — syncing one-shot router state (external system) into component state.
    useEffect(() => {
        const state = location.state as { wishlistToast?: string } | null;
        const message = state?.wishlistToast;
        if (!message) return;
        /* eslint-disable-next-line react-hooks/set-state-in-effect */
        setWishlistToast(message);
        navigate(location.pathname, { replace: true, state: null });
    }, [location.pathname, location.state, navigate]);

    useEffect(() => {
        if (!wishlistToast) return;
        const timer = window.setTimeout(() => setWishlistToast(null), 2600);
        return () => window.clearTimeout(timer);
    }, [wishlistToast]);

    // Trigger next page load when the sentinel element scrolls into view.
    useEffect(() => {
        const target = loadMoreRef.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry?.isIntersecting) return;
                if (isFetchingNextPage || !hasNextPage) return;
                void fetchNextPage();
            },
            { root: null, rootMargin: "220px", threshold: 0 },
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

    // listingsRefreshKey increments when the user posts a new listing.
    // We use it as a dependency in a separate effect just to suppress the lint warning —
    // TanStack Query handles the actual refetch via cache invalidation in the form component.
    useEffect(() => {}, [listingsRefreshKey]);

    return (
        <section className="p-6 sm:p-8">
            {wishlistToast && (
                <div className="fixed right-5 top-24 z-40 w-[min(92vw,26rem)] rounded-2xl border border-[var(--color-primary)] bg-white/95 p-4 shadow-xl backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-[var(--color-primary)] px-2 py-1 text-xs font-bold text-[var(--color-text-on-primary)]">
                            SAVED
                        </div>
                        <p className="flex-1 text-sm font-medium text-black">{wishlistToast}</p>
                        <button
                            type="button"
                            className="text-sm font-bold text-black/60 transition hover:text-black"
                            onClick={() => setWishlistToast(null)}
                            aria-label="Dismiss notification"
                        >
                            x
                        </button>
                    </div>
                </div>
            )}

            <div className="mb-10 flex flex-wrap items-end gap-3">
                <div className="w-full max-w-[13rem]">
                    <label htmlFor="listing-type-filter" className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-black/80">
                        Type
                    </label>
                    <select
                        id="listing-type-filter"
                        className="w-full rounded-2xl border border-black/15 bg-white px-4 py-3 text-lg text-black shadow-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
                        value={listingType}
                        onChange={(e) => setListingType(e.target.value as "" | "item" | "service")}
                    >
                        <option value="">All types</option>
                        <option value="item">Item</option>
                        <option value="service">Service</option>
                    </select>
                </div>

                <div className="w-full max-w-[15rem]">
                    <label htmlFor="category-filter" className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-black/80">
                        Category
                    </label>
                    <select
                        id="category-filter"
                        className="w-full rounded-2xl border border-black/15 bg-white px-4 py-3 text-lg text-black shadow-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="">All categories</option>
                        <option value="6a90f825-6c3c-4060-b5e1-ff394162bb6c">Furniture</option>
                        <option value="716836e6-f8a2-4cba-aa63-36445e70496e">School Supplies</option>
                        <option value="854c925a-84f6-4280-9c9e-b1452167bb33">Free Stuff</option>
                        <option value="95fe7a36-cb29-4c97-9a4d-56dccc56a7de">Transportation</option>
                        <option value="9f280f6c-d4f8-4178-8e61-059243d5c930">Clothing</option>
                        <option value="b87122bf-36dc-418c-a489-cb8ad0497f34">Electronics</option>
                        <option value="be4cc965-718d-4e7d-939f-9ace4dcc837c">Sports & Fitness</option>
                        <option value="cf2121d7-22b7-4e87-ab1b-801d55ebd4fe">Services</option>
                        <option value="dc2b319a-1068-4b06-bcb3-11c1f3dd3fa2">Textbooks</option>
                        <option value="744ab09f-350d-4f75-8b4a-cb84016545ef">Other</option>
                    </select>
                </div>
            </div>

            <p className="mb-10 text-3xl">CATEGORIES</p>

            {isLoading && listingsData.length > 0 && (
                <p className="mb-4 text-sm font-medium text-black/70">Updating listings...</p>
            )}

            {!isLoading && listingsData.length === 0 ? (
                <h2>No listings found.</h2>
            ) : (
                <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
                    {isLoading && listingsData.length > 0 && (
                        <div className="pointer-events-none absolute inset-0 rounded-xl bg-white/20" aria-hidden="true" />
                    )}

                    {listingsData.map((listing: ListingWithDetails) => (
                        <Link
                            key={listing.id}
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
                    ))}
                </div>)}

            {!isLoading && (
                <>
                    <div ref={loadMoreRef} className="h-1" aria-hidden="true" />
                    {isFetchingNextPage && <p className="mt-6 text-sm text-black/70">Loading more listings...</p>}
                    {!hasNextPage && listingsData.length > 0 && (
                        <p className="mt-6 text-sm text-black/70">You&apos;ve reached the end.</p>
                    )}
                </>
            )}
        </section>
    );
}
