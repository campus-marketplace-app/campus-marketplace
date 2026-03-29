import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, Link } from "react-router-dom";
import type { ListingWithDetails } from "@campus-marketplace/backend";
import { getListingsByUser, getProfile } from "@campus-marketplace/backend";
import type { SessionUser, UserProfile } from "../features/types";

//Section 1: outlet context and types
type OutletContext = {
    user: SessionUser | null;
};


const MyListings = () => {
    const navigate = useNavigate();
    const { user } = useOutletContext<OutletContext>();  // Get the logged-in user from the sidebar layout context
    const [profileData, setProfileData] = useState<UserProfile | null>(null);     // State for user profile data
    const [listingsData, setListingsData] = useState<Array<ListingWithDetails>>([]);     // State for all user's listings
    const [isLoading, setIsLoading] = useState(true);     // State to track if data is still loading
    const [filterStatus, setFilterStatus] = useState<"published" | "draft">("published");     // State to track the current filter: published or draft

    // Show sign-in prompt if user is not logged in.
    if (!user) {
        return (
            <div className="flex h-full min-h-[calc(100vh-64px)] w-full items-center justify-center bg-black/50">
                <div className="mx-auto w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
                    <h2 className="mb-4 text-2xl font-bold text-black">Sign In Required</h2>
                    <p className="mb-6 text-gray-700">
                        Please sign in to view and edit your profile.
                    </p>
                    <Link
                        to="/login"
                        className="inline-block w-full rounded bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700 font-semibold"
                    >
                        Go to Log In
                    </Link>
                </div>
            </div>
        );
    }

    // Fetch user profile and listings on component mount
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch profile and listings in parallel
                const [profile, listings] = await Promise.all([
                    getProfile(user.id),
                    getListingsByUser(user.id),
                ]);
                setProfileData(profile);
                setListingsData(listings as ListingWithDetails[]);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user.id]);

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
        <section className="space-y-8 p-6 sm:p-8">
            {/* User Profile Header - Shows avatar, name, bio, and stats */}
            {profileData && (
                <div className="rounded-lg border border-[var(--color-secondary)] bg-[var(--color-primary)] p-6">
                    <div className="flex items-center gap-6">
                        {/* Avatar - shows first letter of name in a colored circle */}
                        <div className="h-24 w-24 rounded-full bg-[var(--color-secondary)] flex items-center justify-center text-white text-4xl">
                            {profileData.display_name?.charAt(0)} /* Display the first letter of the user's name as the avatar initial */
                        </div>

                        {/* User info section - name, bio, and stats */}
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-white">
                                {profileData.display_name}
                            </h1>
                            {profileData.bio && (
                                <p className="mt-2 text-sm text-white/80">{profileData.bio}</p>
                            )}
                            {/* Display count of published and draft listings */}
                            <div className="mt-4 flex gap-6 text-sm text-white/80">
                                <span>📊 {publishedListings.length} Published</span>
                                <span>📝 {draftListings.length} Drafts</span>
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
                    onClick={() => navigate("/listing")}
                    className="rounded-lg bg-[var(--color-secondary)] px-6 py-3 font-bold text-black transition hover:bg-white"
                >
                    + Create Item
                </button>
                <button
                    onClick={() => navigate("/listing")}
                    className="rounded-lg bg-[var(--color-secondary)] px-6 py-3 font-bold text-black transition hover:bg-white"
                >
                    + Create Service
                </button>
            </div>

            {/* Filter dropdown - only show if user has listings */}
            {hasAnyListings && (
                <div className="flex items-center gap-3">
                    <label className="font-semibold uppercase text-white">Filter:</label> //filter label
                    <select //dropdown to select between published and draft listings, updates filterStatus state on change
                        value={filterStatus}
                        onChange={(e) => //update filter state based on user selection - published or draft
                            setFilterStatus(e.target.value as "published" | "draft")
                        }
                        className="rounded-lg bg-[var(--color-secondary)] px-4 py-2 font-semibold text-black"
                    >
                        <option value="published">Published</option> //shows published listings when selected
                        <option value="draft">Draft</option> //shows draft listings when selected
                    </select>
                </div>
            )}

            {/* Listings grid section - shows published or draft listings based on current filter */}
            {hasAnyListings ? (
                <section className="space-y-6">
                    {/* Section title with count - updates based on filter selection */}
                    <h2 className="text-2xl font-bold uppercase text-white">
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
                                    className="cursor-pointer rounded-lg border border-black bg-white p-4 text-center text-black transition hover:shadow-lg"
                                >
                                    {/* Listing image placeholder - images not in basic Listing type */}
                                    <div className="mx-auto mb-3 flex h-32 w-32 items-center justify-center rounded-lg bg-[var(--color-secondary)] text-xs text-black">
                                        {listing.images?.[0]?.path ?? "📷"}
                                    </div>

                                    {/* Listing title */}
                                    <p className="text-lg font-bold leading-tight">{listing.title}</p>

                                    {/* Price and category info */}
                                    <div className="mt-2 flex justify-between text-sm">
                                        <span className="font-semibold">
                                            {listing.price_unit ?? "$"}
                                            {listing.price ?? "0"}
                                        </span>
                                        <span className="text-gray-600">
                                            {listing.category_name ?? "N/A"}
                                        </span>
                                    </div>

                                    {/* Item details (condition) OR Service designation + date posted */}
                                    <div className="mt-2 flex justify-between text-xs text-gray-600">
                                        <span>
                                            {/* Check listing type - items have condition, services don't */}
                                            {listing.type === "item"
                                                ? listing.item_details?.condition || "N/A"
                                                : "Service"}
                                        </span>
                                        <span>{listing.created_at?.split("T")[0] ?? "N/A"}</span>
                                    </div>

                                    {/* Status badge - shows Published or Draft with icon */}
                                    <div className="mt-3 rounded bg-[var(--color-primary)] px-2 py-1 text-xs font-bold text-white">
                                        {filterStatus === "published" ? "✓ PUBLISHED" : "📝 DRAFT"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Empty state for current filter - no listings in this category */
                        <div className="rounded-lg bg-gray-700 p-8 text-center text-white">
                            <p className="text-lg font-semibold">
                                No {filterStatus === "published" ? "published" : "draft"} listings yet.
                            </p>
                        </div>
                    )}
                </section>
            ) : (
                /* Empty state - user has no listings at all (neither published nor draft) */
                <div className="rounded-lg bg-gray-700 p-12 text-center text-white">
                    <p className="text-3xl font-bold">📭</p>
                    <p className="mt-4 text-2xl font-semibold">You haven't posted anything yet!</p>
                    <p className="mt-2 text-gray-300">Start selling today — it only takes a minute</p>

                    {/* Action buttons in empty state - same as top buttons */}
                    <div className="mt-8 flex justify-center gap-4">
                        <button
                            onClick={() => navigate("/listing")}
                            className="rounded-lg bg-[var(--color-secondary)] px-6 py-3 font-bold text-black transition hover:bg-white"
                        >
                            + Create Item
                        </button>
                        <button
                            onClick={() => navigate("/listing")}
                            className="rounded-lg bg-[var(--color-secondary)] px-6 py-3 font-bold text-black transition hover:bg-white"
                        >
                            + Create Service
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
};

export default MyListings;
