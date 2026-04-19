import { useEffect, useState } from "react";
import { useNavigate, useParams, useOutletContext, Link } from "react-router-dom";
import { getListingWithDetails, createConversation, ensureFreshSession, getProfile, publishListing, unpublishListing, deleteListing, getListingImageUrl, getListingPublishReadiness, addToWishlist, removeFromWishlist, isWishlisted, } from "@campus-marketplace/backend";
import type { ListingWithDetails } from "@campus-marketplace/backend";
import type { OutletContext } from "../features/types";
import Form from "../features/form";
import { useConfirm } from "../contexts/ConfirmContext";


export default function Listing() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user, listingsRefreshKey } = useOutletContext<OutletContext>();
    const { confirm, alert: showAlert } = useConfirm();
    const [listingData, setListingData] = useState<ListingWithDetails | null>(null);
    const [messagingLoading, setMessagingLoading] = useState(false);
    const [displayName, setDisplayName] = useState<string>("");
    const [publishLoading, setPublishLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);
    const [isInWishlist, setIsInWishlist] = useState(false);

    const formatDateTime = (value?: string | null) => {
        if (!value) return "N/A";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString();
    };

    const toggleWishlist = async () => {
        if (!user || !listingData) return;

        if (isInWishlist) {
            await removeFromWishlist(user.id, listingData.id);
            setIsInWishlist(false);
        } else {
            await addToWishlist(user.id, listingData.id);
            setIsInWishlist(true);
            navigate("/", { state: { wishlistToast: "Added to your wishlist." } });
        }
    };


    const formatMissingPublishFields = (fields: string[]) => {
        const labels: Record<string, string> = {
            title: "Title",
            category_id: "Category",
            price: "Price",
            location: "Location",
            images: "At least one image",
            item_condition: "Item condition",
            item_quantity: "Item quantity",
            service_duration_minutes: "Service duration",
        };

        return fields.map((field) => labels[field] ?? field);
    };

    const getClientMissingPublishFields = () => {
        if (!listingData) return [] as string[];

        const missing: string[] = [];

        if (!listingData.title || !String(listingData.title).trim()) {
            missing.push("title");
        }

        if (listingData.price === null || listingData.price === undefined || Number.isNaN(Number(listingData.price))) {
            missing.push("price");
        }

        if (!listingData.category_id) {
            missing.push("category_id");
        }

        if (!listingData.location || !String(listingData.location).trim()) {
            missing.push("location");
        }

        if (!Array.isArray(listingData.images) || listingData.images.length === 0) {
            missing.push("images");
        }

        return missing;
    };

    const refreshTokens = async () => {
        const { session } = await ensureFreshSession();
        if (session) {
            localStorage.setItem("access_token", session.access_token);
            localStorage.setItem("refresh_token", session.refresh_token);
        }
    };

    const handlePublish = async () => {
        if (!listingData) return;
        if (!user) {
            await showAlert("Login required", "You must be logged in to publish a listing.");
            navigate("/login");
            return;
        }
        await refreshTokens();
        if (listingData.user_id !== user.id) {
            await showAlert("Not allowed", "You can only publish your own listings.");
            return;
        }
        setPublishLoading(true);
        if (listingData.status === "draft") {
            try {
                const readiness = await getListingPublishReadiness(listingData.id, user.id);
                const clientMissing = getClientMissingPublishFields();
                const mergedMissing = Array.from(new Set([...(readiness.missingFields as string[]), ...clientMissing]));

                if (!readiness.isPublishable || mergedMissing.length > 0) {
                    const missingLabels = formatMissingPublishFields(mergedMissing);
                    await showAlert("Missing fields", `This listing cannot be published yet. Please add:\n- ${missingLabels.join("\n- ")}`);
                } else {
                    await publishListing(listingData.id, user.id);
                    const updatedListing = await getListingWithDetails(listingData.id);
                    setListingData(updatedListing);
                }
            } catch (error) {
                console.error("Error publishing listing:", error);
            }
        }
        else if (listingData.status === "active") {
            try {
                await unpublishListing(listingData.id, user.id);
                const updatedListing = await getListingWithDetails(listingData.id);
                setListingData(updatedListing);
            } catch (error) {
                console.error("Error unpublishing listing:", error);
            }
        }
        setPublishLoading(false);
        void listingsRefreshKey;
    };

    const handleDelete = async () => {
        if (!listingData) return;
        if (!user) {
            await showAlert("Login required", "You must be logged in to delete a listing.");
            navigate("/login");
            return;
        }
        await refreshTokens();
        if (listingData.user_id !== user.id) {
            await showAlert("Not allowed", "You can only delete your own listings.");
            return;
        }
        const confirmed = await confirm(
            "Delete listing",
            "Are you sure you want to delete this listing? This action cannot be undone."
        );
        if (!confirmed) return;
        setDeleteLoading(true);
        try {
            await deleteListing(listingData.id, user?.id);
            await showAlert("Deleted", "Listing deleted successfully.");
            navigate("/");
        } catch {
            console.error("Error deleting listing");
            await showAlert("Error", "Failed to delete listing. Please try again.");
        } finally {
            setDeleteLoading(false);
        }
        void listingsRefreshKey;
    };

    const editListing = () => {
        if (!user || !listingData || listingData.user_id !== user.id) {
            return;
        }
        setShowForm(true);
    };


    useEffect(() => {
        if (!id) {
            navigate("/", { replace: true });
            return;
        }

        console.log("Listing ID from URL:", id as string);

        const callback = async () => {
            try {
                const listing = await getListingWithDetails(id as string);

                if (listing.status !== "active" && (!user || user.id !== listing.user_id)) {
                    setUnavailableMessage("This listing is no longer avaible");
                    return;
                }

                console.log("Listing details:", listing);

                setUnavailableMessage(null);
                setListingData(listing);
                if (user) {
                    setIsInWishlist(await isWishlisted(user.id, listing.id));
                }
                const account = await getProfile(listing.user_id);
                setDisplayName(account.display_name);
            } catch (error) {
                console.error("Error fetching listing details:", error);
                setUnavailableMessage("This listing is no longer avaible");
            }
        };
        callback();
    }, [id, navigate, user]);

    if (unavailableMessage) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50" onClick={() => navigate(-1)} />

                <section className="relative z-10 w-full max-w-[760px]">
                    <div className="overflow-hidden rounded-b-2xl rounded-t-none bg-white shadow-xl">
                        <div className="bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--color-primary)] px-5 py-6 text-center sm:px-6">
                            <p className="text-2xl font-semibold text-[var(--color-text-on-primary)]">{unavailableMessage}</p>
                        </div>
                        <div className="px-5 py-5 text-center sm:px-6">
                            <button
                                type="button"
                                className="rounded-lg border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-black/5"
                                onClick={() => navigate("/", { replace: true })}
                            >
                                Back to marketplace
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    if (!listingData) {
        return <div className="flex h-screen items-center justify-center text-[var(--color-text-on-primary)]">Loading...</div>;
    }

    if (showForm) {
        return (
            <Form
                showForm={true}
                user={user}
                editListing={listingData}
                onClose={() => navigate(-1)}
                onSubmitSuccess={() => {
                    navigate(-1);
                }}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => navigate(-1)} />

            <section className="relative z-10 w-full max-w-[760px]">
                <div className="max-h-[92vh] overflow-y-auto rounded-b-2xl rounded-t-none bg-white p-5 shadow-xl sm:p-6">
                    <div className="-mx-5 -mt-5 bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--color-primary)] px-5 py-6 sm:-mx-6 sm:-mt-6 sm:px-6">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="text-sm font-medium text-[var(--color-text-on-primary)] underline-offset-2 hover:underline"
                        >
                            Back to Listings
                        </button>
                        <div className="mt-3 text-center">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-on-primary)]/85">Listing Details</p>
                            <h2 className="mt-1 text-3xl font-bold tracking-tight text-[var(--color-text-on-primary)]">
                                {listingData?.title ?? "Untitled listing"}
                            </h2>
                        </div>
                    </div>

                    <div className="mt-5 space-y-5">
                        <div>
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">Product Image</p>
                            <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-black/20 bg-white p-5 text-center text-sm uppercase text-black/60">
                                {listingData?.images?.[0]?.path ? (
                                    <img
                                        src={getListingImageUrl(listingData.images[0].path)}
                                        alt={listingData?.images?.[0]?.alt_text ?? "Listing image"}
                                        className="h-64 w-full rounded-lg border border-black/10 object-cover"
                                    />
                                ) : (
                                    "PICTURE OF THE PRODUCT"
                                )}
                            </div>
                            <Link
                                to={`/profile/${listingData?.user_id}`}
                                className="mt-2 inline-block text-sm font-medium text-[var(--color-primary-dark)] hover:underline"
                            >
                                Owned by {displayName}
                            </Link>
                            {user && listingData.user_id === user.id ? (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        className="inline-flex rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-black/5"
                                        type="button"
                                        onClick={editListing}
                                    >
                                        Edit Listing
                                    </button>
                                    <button className="inline-flex rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                                        type="button"
                                        disabled={publishLoading}
                                        onClick={handlePublish}
                                    >
                                        {listingData.status === "draft" ? "Publish" : "Unpublish"}
                                    </button>
                                    <button className="inline-flex rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-text-on-primary)] transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                                        type="button"
                                        disabled={deleteLoading}
                                        onClick={handleDelete}
                                    >
                                        {deleteLoading ? "Deleting..." : "Delete Listing"}
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">Price</p>
                                        <div className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-black">
                                            {listingData?.price_unit ?? "$"}
                                            {listingData?.price ?? "0"}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">Category</p>
                                        <div className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-black">
                                            {listingData?.category_name ?? "Uncategorized"}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {listingData.type === "item" ? (
                                        <>
                                            <div>
                                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">Condition</p>
                                                <div className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-black">
                                                    {listingData.item_details?.condition ?? "N/A"}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">Quantity</p>
                                                <div className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-black">
                                                    {listingData.item_details?.quantity ?? "N/A"}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">Duration (minutes)</p>
                                                <div className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-black">
                                                    {listingData.service_details?.duration_minutes ?? "N/A"}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">Available From</p>
                                                <div className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-black">
                                                    {listingData.service_details?.available_from ?? "N/A"}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {listingData.type === "service" ? (
                                        <div>
                                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">Available To</p>
                                            <div className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-black">
                                                {listingData.service_details?.available_to ?? "N/A"}
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">Type</p>
                                            <div className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-black">
                                                {listingData.type}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">Date Posted</p>
                                        <div className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-black">
                                            {formatDateTime(listingData.created_at)}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">Location</p>
                                    <div className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-black">
                                        {listingData?.location ?? "N/A"}
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/80">Description</p>
                                    <div className="min-h-36 rounded-lg border border-black/10 bg-white px-3 py-3 text-sm text-black">
                                        {listingData?.description ?? "No description provided."}
                                    </div>
                                </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-4">
                            <button
                                type="button"
                                className="rounded-lg border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-black/5"
                                onClick={() => navigate(-1)}
                            >
                                Back
                            </button>

                            {/* Only show "Message Seller" if logged in and not viewing your own listing */}
                            {user && listingData.user_id !== user.id && (
                                <button
                                    type="button"
                                    disabled={messagingLoading}
                                    className="rounded-lg border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                                    onClick={async () => {
                                        setMessagingLoading(true);
                                        try {
                                            // Force a token refresh so the JWT isn't expired.
                                            const { session } = await ensureFreshSession();
                                            // Store refreshed tokens.
                                            localStorage.setItem("access_token", session!.access_token);
                                            localStorage.setItem("refresh_token", session!.refresh_token);

                                            const convo = await createConversation(user.id, listingData.user_id, listingData.id);
                                            navigate(`/messages/${convo.id}`);
                                        } catch (err) {
                                            console.error("Failed to start conversation:", err);
                                            if (String(err).includes("Session expired")) {
                                                await showAlert("Session expired", "Your session has expired. Please log in again.");
                                                navigate("/login");
                                            } else {
                                                await showAlert("Error", "Could not start conversation. Please try again.");
                                            }
                                        } finally {
                                            setMessagingLoading(false);
                                        }
                                    }}
                                >
                                    {messagingLoading ? "Opening..." : "Message Seller"}
                                </button>
                            )}

                            {user && listingData.user_id !== user.id ? (
                                <button
                                    type="button"
                                    className={`rounded-lg px-4 py-2 text-sm font-semibold text-black transition ${isInWishlist ? "border border-black/15 bg-black/10 hover:bg-black/5" : "border border-black/15 bg-white hover:bg-black/5"}`}
                                    onClick={() => void toggleWishlist()}
                                >
                                    {isInWishlist ? "Wishlisted" : "Wishlist"}
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}