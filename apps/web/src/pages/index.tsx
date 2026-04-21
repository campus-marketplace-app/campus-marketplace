import { getListingImageUrl } from "@campus-marketplace/backend";
import type { ListingWithDetails } from "@campus-marketplace/backend";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { Monitor, Shirt, Sofa, BookOpen, Gift, Dumbbell, Zap, Bookmark } from "lucide-react";
import { NoImagePlaceholder } from "../components/NoImagePlaceholder";
import { useSearchListings } from "../hooks/useListings";
import { useProfile } from "../hooks/useProfile";
import { useHomeStats } from "../hooks/useHomeStats";
import { useWishlist, useAddToWishlist, useRemoveFromWishlist } from "../hooks/useWishlist";
import type { SessionUser } from "../features/types";

type OutletContext = {
    searchQuery: string;
    listingsRefreshKey: number;
    user: SessionUser | null;
};

const PAGE_SIZE = 12;

const CATEGORIES = [
    { label: "Electronics", id: "0d8e21f3-8e00-401a-aa28-9b013a9e8470", icon: Monitor, bgClass: "bg-blue-500" },
    { label: "Clothing", id: "c49821a1-a4ed-4143-80aa-fc563717bf96", icon: Shirt, bgClass: "bg-violet-500" },
    { label: "Furniture", id: "7e1c80e5-91c8-4e0a-be4d-74d178ee61a4", icon: Sofa, bgClass: "bg-orange-500" },
    { label: "School Supplies", id: "37d5e9e1-dfd4-4b3d-876d-88142d05e58b", icon: BookOpen, bgClass: "bg-emerald-500" },
    { label: "Free Stuff", id: "447df3d4-bde4-4ac9-bb89-19508018baf5", icon: Gift, bgClass: "bg-pink-500" },
    { label: "Sports", id: "0d51becc-b8dc-420d-8092-221867bd54b0", icon: Dumbbell, bgClass: "bg-[var(--color-primary)]" },
] as const;

const shimmerStyle: React.CSSProperties = {
    background: "linear-gradient(90deg, var(--color-background-alt) 25%, var(--color-border) 50%, var(--color-background-alt) 75%)",
    backgroundSize: "400px 100%",
    animation: "shimmer 1.4s infinite linear",
};

/** Counts from 0 to `target` over `duration` ms using an ease-out curve. */
function useCountUp(target: number | undefined, duration = 900): number {
    const [current, setCurrent] = useState(0);
    useEffect(() => {
        if (target === undefined) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (target === 0) { setCurrent(0); return; }
        const start = performance.now();
        let rafId: number;
        const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            setCurrent(Math.round(target * Math.sqrt(progress)));
            if (progress < 1) rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [target, duration]);
    return current;
}

export default function Index() {
    const location = useLocation();
    const navigate = useNavigate();
    const { searchQuery, user } = useOutletContext<OutletContext>();

    const [category, setCategory] = useState<string>("");
    const [listingType, setListingType] = useState<"" | "item" | "service">("");
    const [priceRange, setPriceRange] = useState<"" | "u25" | "25-100" | "100-500" | "o500">("");
    const [wishlistToast, setWishlistToast] = useState<string | null>(null);
    const [toastExiting, setToastExiting] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    const { data: profile } = useProfile(user?.id);
    const { stats, isLoading: statsLoading } = useHomeStats();

    const activeListingsCount = useCountUp(stats?.activeListings);
    const activeUsersCount = useCountUp(stats?.activeUsers);
    const newTodayCount = useCountUp(stats?.newToday);

    // Preload the full wishlist once; derive a Set for O(1) lookups per card.
    const { data: wishlistItems } = useWishlist(user?.id);
    const wishlistedIds = useMemo(
        () => new Set(wishlistItems?.map((w) => w.listing_id) ?? []),
        [wishlistItems],
    );
    const addMutation = useAddToWishlist();
    const removeMutation = useRemoveFromWishlist();

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

    function dismissToast() {
        setToastExiting(true);
        window.setTimeout(() => { setWishlistToast(null); setToastExiting(false); }, 300);
    }

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
        // Start exit animation at 2300ms so the slide-out completes at ~2600ms total.
        const timer = window.setTimeout(dismissToast, 2300);
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

const displayName = profile?.display_name ?? user?.email ?? "there";

    async function handleWishlistToggle(e: React.MouseEvent, listing: ListingWithDetails) {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            navigate("/login");
            return;
        }
        const isAlready = wishlistedIds.has(listing.id);
        try {
            if (isAlready) {
                await removeMutation.mutateAsync({ userId: user.id, listingId: listing.id });
                setWishlistToast(`"${listing.title}" removed from wishlist`);
            } else {
                await addMutation.mutateAsync({ userId: user.id, listingId: listing.id });
                setWishlistToast(`"${listing.title}" added to your wishlist`);
            }
        } catch {
            setWishlistToast("Could not update wishlist — try again");
        }
    }

    return (
        <section className="space-y-4 p-4 sm:p-6">
            {/* Wishlist toast */}
            {wishlistToast && (
                <div
                    className="fixed right-5 top-24 z-40 w-[min(92vw,26rem)] rounded-2xl border p-4 shadow-xl backdrop-blur-sm"
                    style={{
                        backgroundColor: "var(--color-surface)",
                        borderColor: "var(--color-primary)",
                        animation: toastExiting ? "toastOut 0.3s ease forwards" : "toastIn 0.3s ease forwards",
                    }}
                >
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-[var(--color-primary)] px-2 py-1 text-xs font-bold text-[var(--color-text-on-primary)]">
                            SAVED
                        </div>
                        <p className="flex-1 text-sm font-medium" style={{ color: "var(--color-text)" }}>{wishlistToast}</p>
                        <button
                            type="button"
                            className="text-sm font-bold transition"
                            style={{ color: "var(--color-text-muted)" }}
                            onClick={dismissToast}
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
                    <p className="text-2xl font-bold">Welcome back, {displayName}!</p>
                    <p className="mt-1 text-sm opacity-80">Discover great deals from fellow NJIT students</p>
                </div>
                {/* Stat tiles stay white-on-red — intentional design contrast */}
                <div className="flex shrink-0 gap-3">
                    {([
                        { value: statsLoading ? "—" : activeListingsCount, label: "Active Listings" },
                        { value: statsLoading ? "—" : activeUsersCount, label: "Active Users" },
                        { value: statsLoading ? "—" : newTodayCount, label: "New Today" },
                    ] as const).map((tile) => (
                        <div key={tile.label} className="flex min-w-[80px] flex-col items-center rounded-xl bg-white px-3 py-2 text-black">
                            <span className="text-lg font-bold leading-none">{String(tile.value)}</span>
                            <span className="mt-0.5 text-center text-xs text-black/60">{tile.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Browse by Category + Filters (merged) ── */}
            <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: "var(--color-surface)" }}>
                {/* Category header */}
                <div className="mb-3">
                    <p className="text-lg font-bold" style={{ color: "var(--color-text)" }}>Browse by Category</p>
                </div>

                {/* Category tiles */}
                <div className="flex gap-4 overflow-x-auto px-1 py-2">
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
                                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${bgClass}${isActive ? " ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-surface)]" : ""}`}
                                >
                                    <Icon size={26} color="white" />
                                </div>
                                <span className="mt-1.5 text-center text-xs font-medium leading-tight" style={{ color: "var(--color-text)" }}>{label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Divider */}
                <div className="my-4 border-t" style={{ borderColor: "var(--color-border)" }} />

                {/* Filters row */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <Zap size={16} style={{ color: "var(--color-primary)" }} />
                        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Filters</span>
                    </div>
                    <select
                        aria-label="Listing type"
                        className="rounded-lg border px-3 py-2 text-sm outline-none"
                        style={{ backgroundColor: "var(--color-background)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
                        value={listingType}
                        onChange={(e) => setListingType(e.target.value as "" | "item" | "service")}
                    >
                        <option value="">All types</option>
                        <option value="item">Item</option>
                        <option value="service">Service</option>
                    </select>
                    <select
                        aria-label="Price range"
                        className="rounded-lg border px-3 py-2 text-sm outline-none"
                        style={{ backgroundColor: "var(--color-background)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
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
                        className="ml-auto rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-[var(--color-background)]"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                        onClick={() => { setListingType(""); setCategory(""); setPriceRange(""); }}
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* ── All Listings ── */}
            <div>
                <p className="mb-4 text-xl font-bold" style={{ color: "var(--color-text)" }}>All Listings</p>

                {isLoading && listingsData.length > 0 && (
                    <p className="mb-4 text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>Updating listings...</p>
                )}

                {!isLoading && listingsData.length === 0 && !isLoading ? (
                    <p style={{ color: "var(--color-text-muted)" }}>No listings found.</p>
                ) : (
                    <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {isLoading && listingsData.length > 0 && (
                            <div className="pointer-events-none absolute inset-0 rounded-xl bg-white/10" aria-hidden="true" />
                        )}

                        {/* Skeleton cards shown on initial load */}
                        {isLoading && listingsData.length === 0 && Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="overflow-hidden rounded-2xl"
                                style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}
                            >
                                <div className="h-48 w-full" style={shimmerStyle} />
                                <div className="p-3 space-y-2">
                                    <div className="h-4 rounded" style={{ ...shimmerStyle, width: "65%" }} />
                                    <div className="h-4 rounded" style={{ ...shimmerStyle, width: "30%" }} />
                                    <div className="h-3 rounded" style={{ ...shimmerStyle, width: "45%" }} />
                                </div>
                            </div>
                        ))}

                        {listingsData.map((listing: ListingWithDetails, index: number) => (
                            <Link
                                key={listing.id}
                                to={`/listing/${listing.id}`}
                                state={{ backgroundLocation: location }}
                            >
                                <article
                                    className="overflow-hidden rounded-2xl shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                    style={{
                                        backgroundColor: "var(--color-surface)",
                                        border: "1px solid var(--color-border)",
                                        animation: "fadeSlideIn 0.35s ease forwards",
                                        animationDelay: `${Math.min(index, 8) * 40}ms`,
                                        opacity: 0,
                                    }}
                                >
                                    <div className="relative h-48 w-full" style={{ backgroundColor: "var(--color-background-alt)" }}>
                                        {listing.images?.[0]?.path ? (
                                            <>
                                                <img
                                                    src={getListingImageUrl(listing.images[0].path)}
                                                    alt={listing.images[0].alt_text ?? listing.title}
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = "none";
                                                        const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                                                        if (fb) fb.style.display = "flex";
                                                    }}
                                                />
                                                <NoImagePlaceholder title={listing.title} hidden />
                                            </>
                                        ) : (
                                            <NoImagePlaceholder title={listing.title} />
                                        )}
                                        {/* Wishlist button */}
                                        {(() => {
                                            const saved = wishlistedIds.has(listing.id);
                                            return (
                                                <div className="group absolute right-3 top-3">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => void handleWishlistToggle(e, listing)}
                                                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-2 shadow-md transition ${saved ? "bg-[var(--color-primary)] text-white" : "hover:bg-[var(--color-primary)] hover:text-white"}`}
                                                        style={saved ? {} : { backgroundColor: "var(--color-surface)", color: "var(--color-text-muted)" }}
                                                        aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
                                                    >
                                                        <Bookmark
                                                            size={14}
                                                            className="shrink-0"
                                                            fill={saved ? "currentColor" : "none"}
                                                        />
                                                        <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium transition-all duration-200 group-hover:max-w-[96px]">
                                                            {saved ? "Saved" : "Add to wishlist"}
                                                        </span>
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="p-3">
                                        <p className="line-clamp-2 font-semibold leading-snug" style={{ color: "var(--color-text)" }}>{listing.title}</p>
                                        <p className="mt-1.5 text-base font-bold" style={{ color: "var(--color-primary)" }}>
                                            {listing.price == null ? "Free" : `${listing.price_unit ?? "$"}${listing.price}`}
                                        </p>
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            {listing.category_name && (
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
                                            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${listing.type === "service" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" : "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300"}`}>
                                                {listing.type === "service" ? "Service" : "Item"}
                                            </span>
                                            {listing.type === "item" && listing.item_details?.condition && (
                                                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{listing.item_details.condition}</span>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            </Link>
                        ))}
                    </div>
                )}

                {!isLoading && (
                    <>
                        <div ref={loadMoreRef} className="h-1" aria-hidden="true" />
                        {isFetchingNextPage && <p className="mt-6 text-sm" style={{ color: "var(--color-text-muted)" }}>Loading more listings...</p>}
                        {!hasNextPage && listingsData.length > 0 && (
                            <p className="mt-6 text-sm" style={{ color: "var(--color-text-muted)" }}>You&apos;ve reached the end.</p>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
