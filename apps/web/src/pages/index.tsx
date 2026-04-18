import { getListingImageUrl } from "@campus-marketplace/backend";
import type { ListingWithDetails } from "@campus-marketplace/backend";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { Monitor, Shirt, Sofa, BookOpen, Gift, Dumbbell, Zap, Heart } from "lucide-react";
import { useSearchListings } from "../hooks/useListings";
import { useProfile } from "../hooks/useProfile";
import { useHomeStats } from "../hooks/useHomeStats";
import type { SessionUser } from "../features/types";

type OutletContext = {
    searchQuery: string;
    listingsRefreshKey: number;
    user: SessionUser | null;
};

const PAGE_SIZE = 12;

const CATEGORIES = [
    { label: "Electronics", id: "b87122bf-36dc-418c-a489-cb8ad0497f34", icon: Monitor, bgClass: "bg-blue-500" },
    { label: "Clothing", id: "9f280f6c-d4f8-4178-8e61-059243d5c930", icon: Shirt, bgClass: "bg-violet-500" },
    { label: "Furniture", id: "6a90f825-6c3c-4060-b5e1-ff394162bb6c", icon: Sofa, bgClass: "bg-orange-500" },
    { label: "School Supplies", id: "716836e6-f8a2-4cba-aa63-36445e70496e", icon: BookOpen, bgClass: "bg-emerald-500" },
    { label: "Free Stuff", id: "854c925a-84f6-4280-9c9e-b1452167bb33", icon: Gift, bgClass: "bg-pink-500" },
    { label: "Sports", id: "be4cc965-718d-4e7d-939f-9ace4dcc837c", icon: Dumbbell, bgClass: "bg-[var(--color-primary)]" },
] as const;

export default function Index() {
    const location = useLocation();
    const navigate = useNavigate();
    const { searchQuery, listingsRefreshKey, user } = useOutletContext<OutletContext>();

    const [category, setCategory] = useState<string>("");
    const [listingType, setListingType] = useState<"" | "item" | "service">("");
    const [priceRange, setPriceRange] = useState<"" | "u25" | "25-100" | "100-500" | "o500">("");
    const [wishlistToast, setWishlistToast] = useState<string | null>(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    const { data: profile } = useProfile(user?.id);
    const { stats, isLoading: statsLoading } = useHomeStats();

    const filters = useMemo(() => {
        const priceFilters =
            priceRange === "u25" ? { max_price: 25 }
            : priceRange === "25-100" ? { min_price: 25, max_price: 100 }
            : priceRange === "100-500" ? { min_price: 100, max_price: 500 }
            : priceRange === "o500" ? { min_price: 500 }
            : {};
        return {
            ...(searchQuery.trim() !== "" && { query: searchQuery.trim() }),
            ...(category !== "" && { category_id: category }),
            ...(listingType !== "" && { type: listingType as "item" | "service" }),
            ...priceFilters,
            limit: PAGE_SIZE,
        };
    }, [searchQuery, category, listingType, priceRange]);

    const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useSearchListings(filters);

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
    // TanStack Query handles the actual refetch via cache invalidation in the form component.
    useEffect(() => {}, [listingsRefreshKey]);

    const displayName = profile?.display_name ?? user?.email ?? "there";

    return (
        <section className="space-y-4 p-4 sm:p-6">
            {/* Wishlist toast */}
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

            {/* ── Welcome Banner ── */}
            <div
                className="flex flex-col gap-4 rounded-2xl p-5 text-white md:flex-row md:items-center md:justify-between"
                style={{ backgroundColor: "var(--color-primary)" }}
            >
                <div>
                    <p className="text-2xl font-bold">Welcome back, {displayName}! 👋</p>
                    <p className="mt-1 text-sm opacity-80">Discover great deals from fellow NJIT students</p>
                </div>
                <div className="flex shrink-0 gap-3">
                    {([
                        { value: statsLoading ? "—" : (stats?.activeListings ?? "—"), label: "Active Listings" },
                        { value: statsLoading ? "—" : (stats?.activeUsers ?? "—"), label: "Active Users" },
                        { value: statsLoading ? "—" : (stats?.newToday ?? "—"), label: "New Today" },
                    ] as const).map((tile) => (
                        <div key={tile.label} className="flex min-w-[80px] flex-col items-center rounded-xl bg-white px-3 py-2 text-black">
                            <span className="text-lg font-bold leading-none">{String(tile.value)}</span>
                            <span className="mt-0.5 text-center text-xs text-black/60">{tile.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Browse by Category ── */}
            <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-lg font-bold">Browse by Category</p>
                    <button
                        type="button"
                        className="text-sm font-semibold"
                        style={{ color: "var(--color-primary)" }}
                        onClick={() => setCategory("")}
                    >
                        View All
                    </button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-1">
                    {CATEGORIES.map(({ label, id, icon: Icon, bgClass }) => {
                        const isActive = category === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                aria-pressed={isActive}
                                className="flex min-w-[72px] flex-col items-center"
                                onClick={() => setCategory(isActive ? "" : id)}
                            >
                                <div
                                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${bgClass}${isActive ? " ring-2 ring-[var(--color-primary)] ring-offset-2" : ""}`}
                                >
                                    <Icon size={26} color="white" />
                                </div>
                                <span className="mt-1.5 text-center text-xs font-medium leading-tight">{label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Filters Bar ── */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <Zap size={16} style={{ color: "var(--color-primary)" }} />
                        <span className="text-sm font-semibold">Filters</span>
                    </div>
                    <select
                        aria-label="Listing type"
                        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none"
                        value={listingType}
                        onChange={(e) => setListingType(e.target.value as "" | "item" | "service")}
                    >
                        <option value="">All types</option>
                        <option value="item">Item</option>
                        <option value="service">Service</option>
                    </select>
                    <select
                        aria-label="Category"
                        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none"
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
                        <option value="be4cc965-718d-4e7d-939f-9ace4dcc837c">Sports &amp; Fitness</option>
                        <option value="cf2121d7-22b7-4e87-ab1b-801d55ebd4fe">Services</option>
                        <option value="dc2b319a-1068-4b06-bcb3-11c1f3dd3fa2">Textbooks</option>
                        <option value="744ab09f-350d-4f75-8b4a-cb84016545ef">Other</option>
                    </select>
                    <select
                        aria-label="Price range"
                        className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none"
                        value={priceRange}
                        onChange={(e) => setPriceRange(e.target.value as "" | "u25" | "25-100" | "100-500" | "o500")}
                    >
                        <option value="">Any price</option>
                        <option value="u25">Under $25</option>
                        <option value="25-100">$25–$100</option>
                        <option value="100-500">$100–$500</option>
                        <option value="o500">Over $500</option>
                    </select>
                    <button
                        type="button"
                        className="ml-auto rounded-lg border border-black/20 px-3 py-2 text-sm font-medium hover:bg-black/5"
                        onClick={() => { setListingType(""); setCategory(""); setPriceRange(""); }}
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* ── All Listings ── */}
            <div>
                <p className="mb-4 text-xl font-bold">All Listings</p>

                {isLoading && listingsData.length > 0 && (
                    <p className="mb-4 text-sm font-medium text-black/70">Updating listings...</p>
                )}

                {!isLoading && listingsData.length === 0 ? (
                    <p className="text-black/60">No listings found.</p>
                ) : (
                    <div className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {isLoading && listingsData.length > 0 && (
                            <div className="pointer-events-none absolute inset-0 rounded-xl bg-white/20" aria-hidden="true" />
                        )}
                        {listingsData.map((listing: ListingWithDetails) => (
                            <Link
                                key={listing.id}
                                to={`/listing/${listing.id}`}
                                state={{ backgroundLocation: location }}
                            >
                                <article className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                                    <div className="relative h-48 w-full bg-[var(--color-secondary)]">
                                        {listing.images?.[0]?.path ? (
                                            <img
                                                src={getListingImageUrl(listing.images[0].path)}
                                                alt={listing.images[0].alt_text ?? listing.title}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="absolute inset-0 flex items-center justify-center text-3xl">📷</span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                            className="absolute right-3 top-3 rounded-full bg-white p-2 shadow-md transition hover:scale-110"
                                            aria-label="Save listing"
                                        >
                                            <Heart size={16} className="text-black/50" />
                                        </button>
                                    </div>
                                    <div className="p-3">
                                        <p className="line-clamp-2 font-semibold leading-snug">{listing.title}</p>
                                        <div className="mt-1.5 flex items-center justify-between text-sm">
                                            <span className="font-bold" style={{ color: "var(--color-primary)" }}>
                                                {listing.price == null ? "—" : `${listing.price_unit ?? "$"}${listing.price}`}
                                            </span>
                                            <span className="text-xs text-black/50">{listing.category_name ?? ""}</span>
                                        </div>
                                        <p className="mt-1 text-xs text-black/40">
                                            {listing.type === "item" ? (listing.item_details?.condition ?? "") : "Service"}
                                            {" · "}
                                            {listing.created_at?.split("T")[0] ?? ""}
                                        </p>
                                    </div>
                                </article>
                            </Link>
                        ))}
                    </div>
                )}

                {!isLoading && (
                    <>
                        <div ref={loadMoreRef} className="h-1" aria-hidden="true" />
                        {isFetchingNextPage && <p className="mt-6 text-sm text-black/70">Loading more listings...</p>}
                        {!hasNextPage && listingsData.length > 0 && (
                            <p className="mt-6 text-sm text-black/70">You&apos;ve reached the end.</p>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
