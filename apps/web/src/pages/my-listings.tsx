import { useNavigate, useOutletContext, Link } from "react-router-dom";
import type { ListingWithDetails } from "@campus-marketplace/backend";
import { getListingImageUrl, getAvatarUrl } from "@campus-marketplace/backend";
import type { SessionUser } from "../features/types";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useProfile } from "../hooks/useProfile";
import { useListingsByUser } from "../hooks/useListings";
import { NoImagePlaceholder } from "../components/NoImagePlaceholder";

type OutletContext = {
    user: SessionUser | null;
    openPostForm: () => void;
};

type Tab = "all" | "published" | "draft";

const TABS: { value: Tab; label: string }[] = [
    { value: "all", label: "All" },
    { value: "published", label: "Published" },
    { value: "draft", label: "Drafts" },
];

const shimmerStyle: React.CSSProperties = {
    background: "linear-gradient(90deg, var(--color-background-alt) 25%, var(--color-border) 50%, var(--color-background-alt) 75%)",
    backgroundSize: "400px 100%",
    animation: "shimmer 1.4s infinite linear",
};

function statusBadge(status: string) {
    switch (status) {
        case "active":
            return { label: "Published", className: "bg-emerald-500 text-white" };
        case "draft":
            return { label: "Draft", className: "bg-gray-400 text-white dark:bg-gray-600" };
        case "sold":
            return { label: "Sold", className: "bg-[var(--color-primary)] text-white" };
        case "archived":
            return { label: "Archived", className: "bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300" };
        default:
            return { label: status, className: "bg-gray-400 text-white" };
    }
}

/** Counts from 0 to `target` over `duration` ms using an ease-out curve. */
function useCountUp(target: number | undefined, duration = 900): number {
    const [current, setCurrent] = useState(0);
    useEffect(() => {
        if (target === undefined) return;
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

const MyListings = () => {
    const navigate = useNavigate();
    const { user, openPostForm } = useOutletContext<OutletContext>();
    const [activeTab, setActiveTab] = useState<Tab>("all");
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [pillStyle, setPillStyle] = useState({ left: 4, width: 0 });

    useLayoutEffect(() => {
        const idx = TABS.findIndex(t => t.value === activeTab);
        const btn = tabRefs.current[idx];
        if (btn) setPillStyle({ left: btn.offsetLeft, width: btn.offsetWidth });
    }, [activeTab]);

    const { data: profileData } = useProfile(user?.id);
    const { data: listingsData = [], isLoading } = useListingsByUser(user?.id);

    const publishedListings = listingsData.filter((l) => l.status === "active");
    const draftListings = listingsData.filter((l) => l.status === "draft");

    const totalCount = useCountUp(isLoading ? undefined : listingsData.length);
    const publishedCount = useCountUp(isLoading ? undefined : publishedListings.length);
    const draftCount = useCountUp(isLoading ? undefined : draftListings.length);

    const filteredListings =
        activeTab === "published" ? publishedListings
        : activeTab === "draft" ? draftListings
        : listingsData;

    const displayName = profileData?.display_name ?? user?.email?.split("@")[0] ?? "there";

    if (!user) {
        return (
            <div className="flex h-full min-h-[calc(100vh-64px)] w-full items-center justify-center bg-black/50">
                <div className="mx-auto w-full max-w-md rounded-xl p-8 shadow-lg" style={{ backgroundColor: "var(--color-surface)" }}>
                    <h2 className="mb-4 text-center text-2xl font-bold" style={{ color: "var(--color-text)" }}>Sign in required</h2>
                    <p className="mb-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                        Please sign in to view and manage your listings.
                    </p>
                    <Link
                        to="/login"
                        className="block rounded-lg px-4 py-2 text-center font-semibold"
                        style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary)" }}
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <section className="space-y-5 p-4 sm:p-6">
            {/* ── Header Banner ── */}
            <div
                className="flex flex-col gap-4 rounded-2xl p-5 text-white md:flex-row md:items-center md:justify-between"
                style={{ backgroundColor: "var(--color-primary)" }}
            >
                <div className="flex items-center gap-4">
                    {profileData?.avatar_path ? (
                        <img
                            src={getAvatarUrl(profileData.avatar_path)}
                            alt={displayName}
                            className="h-14 w-14 shrink-0 rounded-full object-cover"
                            style={{ border: "2px solid rgba(255,255,255,0.4)" }}
                        />
                    ) : (
                        <div
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-extrabold"
                            style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white" }}
                        >
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <p className="text-2xl font-bold">{displayName}'s Listings</p>
                        <p className="mt-0.5 text-sm opacity-80">Manage and track all your listings</p>
                    </div>
                </div>
                <div className="flex shrink-0 gap-3">
                    {([
                        { value: isLoading ? "—" : totalCount, label: "Total" },
                        { value: isLoading ? "—" : publishedCount, label: "Published" },
                        { value: isLoading ? "—" : draftCount, label: "Drafts" },
                    ] as const).map((tile) => (
                        <div key={tile.label} className="flex min-w-[72px] flex-col items-center rounded-xl bg-white px-3 py-2 text-black">
                            <span className="text-lg font-bold leading-none">{String(tile.value)}</span>
                            <span className="mt-0.5 text-center text-xs text-black/60">{tile.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Actions row ── */}
            <div className="flex items-center justify-between gap-3">
                {/* Filter tabs with sliding pill */}
                <div
                    className="relative flex rounded-xl p-1"
                    style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                    {/* Animated slider pill — sized and positioned by measuring each button */}
                    <div
                        className="absolute top-1 rounded-lg"
                        style={{
                            backgroundColor: "var(--color-primary)",
                            height: "calc(100% - 8px)",
                            left: pillStyle.left,
                            width: pillStyle.width,
                            transition: "left 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                        aria-hidden="true"
                    />
                    {TABS.map(({ value, label }, i) => (
                        <button
                            key={value}
                            ref={(el) => { tabRefs.current[i] = el; }}
                            type="button"
                            onClick={() => setActiveTab(value)}
                            className="relative z-10 px-4 py-1.5 text-sm font-semibold transition-colors duration-200"
                            style={{
                                color: activeTab === value ? "var(--color-text-on-primary)" : "var(--color-text-muted)",
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={openPostForm}
                    className="rounded-lg px-5 py-2 text-sm font-semibold transition hover:opacity-90"
                    style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary)" }}
                >
                    + New Listing
                </button>
            </div>

            {/* ── Listings grid ── */}
            {isLoading ? (
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="overflow-hidden rounded-2xl"
                            style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}
                        >
                            <div className="h-48 w-full" style={shimmerStyle} />
                            <div className="space-y-2 p-3">
                                <div className="h-4 rounded" style={{ ...shimmerStyle, width: "65%" }} />
                                <div className="h-4 rounded" style={{ ...shimmerStyle, width: "30%" }} />
                                <div className="h-3 rounded" style={{ ...shimmerStyle, width: "45%" }} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredListings.length === 0 ? (
                <div
                    className="rounded-2xl p-12 text-center"
                    style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                    <p className="text-3xl">📭</p>
                    <p className="mt-4 text-xl font-semibold" style={{ color: "var(--color-text)" }}>
                        {listingsData.length === 0
                            ? "You haven't posted anything yet!"
                            : `No ${activeTab === "published" ? "published" : "draft"} listings.`}
                    </p>
                    <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                        {listingsData.length === 0 ? "Start selling today — it only takes a minute." : "Switch tabs to see your other listings."}
                    </p>
                    {listingsData.length === 0 && (
                        <button
                            type="button"
                            onClick={openPostForm}
                            className="mt-6 rounded-lg px-6 py-2.5 font-semibold transition hover:opacity-90"
                            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-text-on-primary)" }}
                        >
                            + Create draft listing
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
                        Showing {filteredListings.length} listing{filteredListings.length !== 1 ? "s" : ""}
                    </p>
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredListings.map((listing: ListingWithDetails, index: number) => {
                            const badge = statusBadge(listing.status ?? "draft");
                            return (
                                <div
                                    key={listing.id}
                                    onClick={() => navigate(`/listing/${listing.id}`)}
                                    className="cursor-pointer overflow-hidden rounded-2xl shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
                                        {/* Status badge */}
                                        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${badge.className}`}>
                                            {badge.label}
                                        </span>
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
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </section>
    );
};

export default MyListings;
