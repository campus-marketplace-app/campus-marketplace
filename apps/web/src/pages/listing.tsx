import { useEffect, useState } from "react";
import { useNavigate, useParams, useOutletContext, Link } from "react-router-dom";
import { createConversation, ensureFreshSession, publishListing, unpublishListing, deleteListing, getListingImageUrl, getListingPublishReadiness, addToWishlist, removeFromWishlist } from "@campus-marketplace/backend";
import type { OutletContext } from "../features/types";
import Form from "../features/form";
import { useConfirm } from "../contexts/ConfirmContext";
import { useListingDetail, useInvalidateListings } from "../hooks/useListings";
import { useProfile } from "../hooks/useProfile";
import { useIsWishlisted, wishlistKeys } from "../hooks/useWishlist";
import { useQueryClient } from "@tanstack/react-query";


export default function Listing() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useOutletContext<OutletContext>();
    const { confirm, alert: showAlert } = useConfirm();
    const [messagingLoading, setMessagingLoading] = useState(false);
    const [publishLoading, setPublishLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Cached data fetches — no manual useEffect needed.
    const { data: listingData, refetch: refetchListing } = useListingDetail(id);
    const { data: sellerProfile } = useProfile(listingData?.user_id);
    const isInWishlist = useIsWishlisted(user?.id, listingData?.id);
    const { invalidateDetail, invalidateByUser, invalidateAll } = useInvalidateListings();
    const queryClient = useQueryClient();

    // Show unavailable message when listing is inactive and viewer is not the owner.
    const unavailableMessage =
        listingData && listingData.status !== "active" && (!user || user.id !== listingData.user_id)
            ? "This listing is no longer avaible"
            : null;

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
        } else {
            await addToWishlist(user.id, listingData.id);
            navigate("/", { state: { wishlistToast: "Added to your wishlist." } });
        }
        // Invalidate the wishlist cache so useIsWishlisted reflects the new state.
        if (user) {
            void queryClient.invalidateQueries({ queryKey: wishlistKeys.byUser(user.id) });
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
                    // Invalidate cache so this listing and the user's listings list both refresh.
                    invalidateDetail(listingData.id);
                    invalidateByUser(user.id);
                    await refetchListing();
                }
            } catch (error) {
                console.error("Error publishing listing:", error);
            }
        }
        else if (listingData.status === "active") {
            try {
                await unpublishListing(listingData.id, user.id);
                invalidateDetail(listingData.id);
                invalidateByUser(user.id);
                await refetchListing();
            } catch (error) {
                console.error("Error unpublishing listing:", error);
            }
        }
        setPublishLoading(false);
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
            // Invalidate this listing's detail and the user's listings list.
            invalidateDetail(listingData.id);
            invalidateByUser(user.id);
            invalidateAll();
            await showAlert("Deleted", "Listing deleted successfully.");
            navigate("/");
        } catch {
            console.error("Error deleting listing");
            await showAlert("Error", "Failed to delete listing. Please try again.");
        } finally {
            setDeleteLoading(false);
        }
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
        }
    }, [id, navigate]);

    if (unavailableMessage) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-gray-600/55" onClick={() => navigate(-1)} />

                <section className="relative z-10 w-full max-w-xl p-6 sm:p-8">
                    <div className="rounded-sm bg-[var(--color-primary)] p-8 text-center shadow-lg sm:p-10">
                        <p className="text-2xl font-semibold text-[var(--color-text-on-primary)]">{unavailableMessage}</p>
                        <button
                            type="button"
                            className="mt-6 bg-[var(--color-accent)] px-8 py-2 text-xl text-black transition hover:bg-white"
                            onClick={() => navigate("/", { replace: true })}
                        >
                            Back to marketplace
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    if (!listingData) {
        return <div className="flex h-screen items-center justify-center text-[var(--color-text-on-primary)]">Loading...</div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-gray-600/55" onClick={() => navigate(-1)} />

            <section className="relative z-10 w-full p-6 sm:p-8">
                <div className="mx-auto max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-sm bg-[var(--color-primary)] p-6 shadow-lg sm:p-10">
                    <div className="space-y-8">
                        <div className="mx-auto w-full max-w-sm">
                            <p className="mb-2 text-center text-sm font-semibold uppercase tracking-wide text-[var(--color-text-on-primary)]">Title</p>
                            <div className="rounded-2xl bg-white px-4 py-3 text-center text-3xl text-black">
                                {listingData?.title ?? "Untitled listing"}
                            </div>
                        </div>

                        <div className="grid gap-8 md:grid-cols-[1.1fr_1.4fr]">
                            <div>
                                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-on-primary)]">Product Image</p>
                                <div className="flex min-h-72 items-center justify-center rounded-xl bg-[var(--color-accent)] p-6 text-center text-sm uppercase text-black">
                                    {listingData?.images?.[0]?.path ? (
                                        <img
                                            src={getListingImageUrl(listingData.images[0].path)}
                                            alt={listingData?.images?.[0]?.alt_text ?? "Listing image"}
                                            className="h-64 w-full rounded-lg object-cover"
                                        />
                                    ) : (
                                        "PICTURE OF THE PRODUCT"
                                    )}
                                </div>
                                <Link
                                    to={`/profile/${listingData?.user_id}`}
                                    className="mt-2 inline-block text-sm text-blue-500 hover:underline"
                                >
                                    Owned by {sellerProfile?.display_name ?? ""}
                                </Link>
                                {user && listingData.user_id === user.id ? (
                                    <div className="mt-4 flex flex-col items-start gap-2">
                                        <button
                                            className="inline-flex rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm text-black transition hover:bg-white"
                                            type="button"
                                            onClick={editListing}
                                        >
                                            Edit Listing
                                        </button>
                                        <button className="inline-flex rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                                            type="button"
                                            disabled={publishLoading}
                                            onClick={handlePublish}
                                        >
                                            {listingData.status === "draft" ? "Publish" : "Unpublish"}
                                        </button>
                                        <button className="inline-flex rounded-xl bg-red-500 px-4 py-2 text-sm text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-on-primary)]">Price</p>
                                        <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                            {listingData?.price_unit ?? "$"}
                                            {listingData?.price ?? "0"}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-on-primary)]">Category</p>
                                        <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                            {listingData?.category_name ?? "Uncategorized"}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {listingData.type === "item" ? (
                                        <>
                                            <div>
                                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-on-primary)]">Condition</p>
                                                <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                                    {listingData.item_details?.condition ?? "N/A"}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-on-primary)]">Quantity</p>
                                                <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                                    {listingData.item_details?.quantity ?? "N/A"}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-on-primary)]">Duration (minutes)</p>
                                                <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                                    {listingData.service_details?.duration_minutes ?? "N/A"}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-on-primary)]">Available From</p>
                                                <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                                    {listingData.service_details?.available_from ?? "N/A"}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {listingData.type === "service" ? (
                                        <div>
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-on-primary)]">Available To</p>
                                            <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                                {listingData.service_details?.available_to ?? "N/A"}
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-on-primary)]">Type</p>
                                            <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                                {listingData.type}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-on-primary)]">Date Posted</p>
                                        <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                            {formatDateTime(listingData.created_at)}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-on-primary)]">Location</p>
                                    <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                        {listingData?.location ?? "N/A"}
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-on-primary)]">Description</p>
                                    <div className="min-h-36 rounded-2xl bg-white px-4 py-4 text-sm text-black">
                                        {listingData?.description ?? "No description provided."}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-8">
                            <button
                                type="button"
                                className="bg-[var(--color-accent)] px-8 py-2 text-2xl text-black transition hover:bg-white"
                                onClick={() => navigate(-1)}
                            >
                                back
                            </button>

                            {/* Only show "Message Seller" if logged in and not viewing your own listing */}
                            {user && listingData.user_id !== user.id && (
                                <button
                                    type="button"
                                    disabled={messagingLoading}
                                    className="bg-[var(--color-accent)] px-8 py-2 text-2xl text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
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
                                    className={`px-8 py-2 text-2xl text-black transition ${isInWishlist ? "bg-gray-300 hover:bg-gray-200" : "bg-[var(--color-accent)] hover:bg-white"}`}
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