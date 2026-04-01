import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, Link } from "react-router-dom";
import type { ListingWithDetails } from "@campus-marketplace/backend";
import { getListingImageUrl, getListingWithDetails, getListingsByUser, getProfile } from "@campus-marketplace/backend";
import type { SessionUser, UserProfile } from "../features/types";

//Section 1: outlet context and types
type OutletContext = {
    user: SessionUser | null;
    openPostForm: () => void;
};


const MyListings = () => {
    const navigate = useNavigate();
    const { user, openPostForm } = useOutletContext<OutletContext>();  // Get context from the sidebar layout
    const [profileData, setProfileData] = useState<UserProfile | null>(null);     // State for user profile data
    const [listingsData, setListingsData] = useState<Array<ListingWithDetails>>([]);     // State for all user's listings
    const [isLoading, setIsLoading] = useState(true);     // State to track if data is still loading
    const [filterStatus, setFilterStatus] = useState<"published" | "draft">("published");     // State to track the current filter: published or draft

    // Fetch user profile and listings on component mount
    useEffect(() => {
        if (!user) {
            setProfileData(null);
            setListingsData([]);
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch profile and listings in parallel
                const [profile, listings] = await Promise.all([
                    getProfile(user.id),
                    getListingsByUser(user.id),
                ]);

                const detailedListings = await Promise.all(
                    listings.map((listing) => getListingWithDetails(listing.id)),
                );

                setProfileData(profile);
                setListingsData(detailedListings);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        void fetchData();
    }, [user]);

    // Show sign-in prompt if user is not logged in.
    if (!user) {
        return (
            <div className="flex h-full min-h-[calc(100vh-64px)] w-full items-center justify-center bg-black/50">
                <div className="mx-auto w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
                    <h2 className="mb-4 text-center text-2xl font-bold text-black">Sign in required</h2>
                    <p className="mb-6 text-center text-gray-600">
                        Please sign in to view and edit your listings.
                    </p>
                    <Link
                        to="/login"
                        className="block rounded bg-[var(--color-primary)] px-4 py-2 text-center font-semibold text-[var(--color-text-on-primary)]"
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    // Filter listings by status: active = published, draft = draft
    const publishedListings = listingsData.filter((l) => l.status === "active");
    const draftListings = listingsData.filter((l) => l.status === "draft");
    // Get listings based on current filter selection
    const filteredListings =
        filterStatus === "published" ? publishedListings : draftListings;
    // Check if user has any listings at all
    const hasAnyListings = listingsData.length > 0;

    // Show loading spinner while fetching data
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center text-white">
                <p className="text-2xl font-semibold">Loading your listings...</p>
            </div>
        );
    }

    return (
        <section className="space-y-8 bg-[var(--color-background)] p-6 sm:p-8">
            {/* User Profile Header - Shows avatar, name, bio, and stats */}
            {profileData && (
                <div className="rounded-2xl border p-6 shadow-lg"
                    style={{
                        borderColor: "color-mix(in srgb, var(--color-primary) 40%, white)",
                        backgroundColor: "var(--color-primary)",
                    }}
                >
                    <div className="flex items-center gap-6">
                        {/* Avatar - shows first letter of name in a colored circle */}
                        <div className="flex h-24 w-24 items-center justify-center rounded-full border text-4xl font-extrabold text-black shadow-inner"
                            style={{
                                backgroundColor: "color-mix(in srgb, var(--color-secondary) 72%, white)",
                                borderColor: "color-mix(in srgb, var(--color-primary) 35%, white)",
                            }}
                        >
                            {profileData.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>

                        {/* User info section - name, bio, and stats */}
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-[var(--color-text-on-primary)]">
                                {profileData.display_name}
                            </h1>
                            {profileData.bio && (
                                <p className="mt-2 text-sm text-[var(--color-text-on-primary)]/85">{profileData.bio}</p>
                            )}
                            {/* Display count of published and draft listings */}
                            <div className="mt-4 flex flex-wrap gap-3 text-sm">
                                <span className="rounded-full px-3 py-1 font-semibold text-black"
                                    style={{ backgroundColor: "color-mix(in srgb, var(--color-secondary) 80%, white)" }}
                                >📊 {publishedListings.length} Published</span>
                                <span className="rounded-full px-3 py-1 font-semibold text-black"
                                    style={{ backgroundColor: "color-mix(in srgb, var(--color-secondary) 80%, white)" }}
                                >📝 {draftListings.length} Drafts</span>
                            </div>
                        </div>

                        {/* Edit Profile button - navigates to profile page */}
                        <button
                            onClick={() => navigate("/profile")}
                            className="rounded-lg bg-[var(--color-secondary)] px-6 py-2 font-semibold text-black transition hover:bg-white"
                        >
                            Edit Profile
                        </button>
                    </div>
                </div>
            )}

            {/* Action buttons to create new Item or Service listing */}
            <div className="flex gap-4">
                <button
                    onClick={openPostForm}
                    className="rounded-lg border border-white/40 bg-[var(--color-secondary)] px-6 py-3 font-bold text-black shadow-sm transition hover:brightness-110"
                >
                    + Create draft listing
                </button>
            </div>

            {/* Filter dropdown - only show if user has listings */}
            {hasAnyListings && (
                <div
                    className="flex w-fit items-center gap-3 rounded-xl px-3 py-2"
                    style={{
                        backgroundColor: "var(--color-primary)",
                    }}
                >
                    <label className="font-semibold uppercase text-[var(--color-text-on-primary)]">Filter:</label>
                    <select 
                        value={filterStatus}
                        onChange={(e) => 
                            setFilterStatus(e.target.value as "published" | "draft")
                        }
                        className="rounded-lg border border-white/40 bg-[var(--color-primary)] px-4 py-2 font-semibold text-[var(--color-text-on-primary)] shadow-sm"
                    >
                        <option value="published">Published</option> 
                        <option value="draft">Draft</option>
                    </select>
                </div>
            )}

            {/* Listings grid section - shows published or draft listings based on current filter */}
            {hasAnyListings ? (
                <section className="space-y-6">
                    {/* Section title with count - updates based on filter selection */}
                    <h2 className="text-2xl font-bold uppercase text-black">
                        {filterStatus === "published"
                            ? `Published Listings (${publishedListings.length})`
                            : `Draft Listings (${draftListings.length})`}
                    </h2>

                    {/* Grid of listing cards */}
                    {filteredListings.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {filteredListings.map((listing) => (
                                <div
                                    key={listing.id}
                                    onClick={() => navigate(`/listing/${listing.id}`)}
                                    className="cursor-pointer rounded-xl border p-4 text-left text-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
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

                                    {/* Listing title */}
                                    <p className="text-lg font-bold leading-tight">{listing.title}</p>

                                    {/* Price and category info */}
                                    <div className="mt-2 flex justify-between text-sm">
                                        <span className="font-semibold">
                                            {listing.price_unit ?? "$"}
                                            {listing.price ?? "0"}
                                        </span>
                                        <span className="text-gray-700">
                                            {listing.category_name ?? "N/A"}
                                        </span>
                                    </div>

                                    {/* Item details (condition) OR Service designation + date posted */}
                                    <div className="mt-2 flex justify-between text-xs text-gray-700">
                                        <span>
                                            {/* Check listing type - items have condition, services don't */}
                                            {listing.type === "item"
                                                ? listing.item_details?.condition || "N/A"
                                                : "Service"}
                                        </span>
                                        <span>{listing.created_at?.split("T")[0] ?? "N/A"}</span>
                                    </div>

                                    {/* Status badge - shows Published or Draft with icon */}
                                    <div className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold text-white"
                                        style={{ backgroundColor: "var(--color-primary)" }}
                                    >
                                        {listing.status === "active" ? "✓ PUBLISHED" : "📝 DRAFT"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Empty state for current filter - no listings in this category */
                        <div
                            className="rounded-xl p-8 text-center text-black"
                            style={{ backgroundColor: "color-mix(in srgb, var(--color-secondary) 34%, white)" }}
                        >
                            <p className="text-lg font-semibold">
                                No {filterStatus === "published" ? "published" : "draft"} listings yet.
                            </p>
                        </div>
                    )}
                </section>
            ) : (
                /* Empty state - user has no listings at all (neither published nor draft) */
                <div
                    className="rounded-xl p-12 text-center text-black"
                    style={{ backgroundColor: "color-mix(in srgb, var(--color-secondary) 34%, white)" }}
                >
                    <p className="text-3xl font-bold">📭</p>
                    <p className="mt-4 text-2xl font-semibold">You haven't posted anything yet!</p>
                    <p className="mt-2 text-gray-700">Start selling today — it only takes a minute</p>

                    {/* Action buttons in empty state - same as top buttons */}
                    <div className="mt-8 flex justify-center gap-4">
                        <button
                            onClick={openPostForm}
                            className="rounded-lg bg-[var(--color-secondary)] px-6 py-3 font-bold text-black transition hover:brightness-110"
                        >
                            + Create draft listing
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
};

export default MyListings;
