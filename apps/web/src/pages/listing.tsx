import { useEffect, useState } from "react";
import { useNavigate, useParams, useOutletContext, Link } from "react-router-dom";
import { createConversation, ensureFreshSession, publishListing, unpublishListing, deleteListing, getListingImageUrl, getListingPublishReadiness, addToWishlist, removeFromWishlist, markListingAsSold, ListingAlreadySoldError } from "@campus-marketplace/backend";
import type { OutletContext } from "../features/types";
import Form from "../features/form";
import { useConfirm } from "../contexts/ConfirmContext";
import { useListingDetail, useInvalidateListings } from "../hooks/useListings";
import { useProfile } from "../hooks/useProfile";
import { useIsWishlisted, wishlistKeys } from "../hooks/useWishlist";
import { useQueryClient } from "@tanstack/react-query";
import { ListingManagementPanel } from "../components/ListingManagementPanel";


export default function Listing() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useOutletContext<OutletContext>();
    const { confirm, alert: showAlert } = useConfirm();
    const [messagingLoading, setMessagingLoading] = useState(false);
    const [publishLoading, setPublishLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [soldLoading, setSoldLoading] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<"draft" | "active" | "sold">("draft");
    const [showForm, setShowForm] = useState(false);

    // Cached data fetches — no manual useEffect needed.
    const { data: listingData, refetch: refetchListing } = useListingDetail(id);
    const { data: sellerProfile } = useProfile(listingData?.user_id);
    const isInWishlist = useIsWishlisted(user?.id, listingData?.id);
    const { invalidateDetail, invalidateByUser, invalidateAll } = useInvalidateListings();
    const queryClient = useQueryClient();

    const toOwnerStatus = (status?: string): "draft" | "active" | "sold" => {
        if (status === "active" || status === "sold") return status;
        return "draft";
    };

    const ownerStatus = toOwnerStatus(listingData?.status);
    const statusBusy = publishLoading || soldLoading;
    const statusLocked = ownerStatus === "sold";

    // Show unavailable message when listing is inactive and viewer is not the owner.
    const unavailableMessage =
        listingData && listingData.status !== "active" && (!user || user.id !== listingData.user_id)
            ? "This listing is no longer available"
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

    async function handleMarkAsSold(listingId: string, userId: string) {
        await refreshTokens();
        try {
            await markListingAsSold(listingId, userId);
            invalidateByUser(userId);
            await refetchListing();
        } catch (err) {
            if (err instanceof ListingAlreadySoldError) {
                await refetchListing();
            } else {
                throw err;
            }
        }
    }


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

        if (listingData.type === "item") {
            if (!listingData.item_details?.condition) missing.push("item_condition");
            if (!listingData.item_details?.quantity || listingData.item_details.quantity < 1) missing.push("item_quantity");
        }

        if (listingData.type === "service") {
            if (!listingData.service_details?.duration_minutes || listingData.service_details.duration_minutes <= 0) {
                missing.push("service_duration_minutes");
            }
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

    const applyStatusChange = async (nextStatus: "draft" | "active" | "sold") => {
        if (!listingData) return;
        if (!user) {
            await showAlert("Login required", "You must be logged in to update listing status.");
            navigate("/login");
            return;
        }
        await refreshTokens();
        if (listingData.user_id !== user.id) {
            await showAlert("Not allowed", "You can only update your own listing status.");
            return;
        }

        const currentStatus = toOwnerStatus(listingData.status);
        if (currentStatus === nextStatus) return;

        if (currentStatus === "sold") {
            await showAlert("Status locked", "Completed listings cannot be reopened.");
            return;
        }

        if (nextStatus === "sold") {
            const confirmed = await confirm(
                "Mark as Complete?",
                "This will archive the listing and lock all messages on it. This cannot be undone.",
                "Archive"
            );
            if (!confirmed) return;

            setSoldLoading(true);
            try {
                await handleMarkAsSold(listingData.id, user.id);
            } catch (error) {
                console.error("Error marking listing as complete:", error);
                await showAlert("Error", "Failed to mark listing as complete. Please try again.");
            } finally {
                setSoldLoading(false);
            }
            return;
        }

        setPublishLoading(true);
        try {
            if (nextStatus === "active" && currentStatus === "draft") {
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
            } else if (nextStatus === "draft" && currentStatus === "active") {
                await unpublishListing(listingData.id, user.id);
                invalidateDetail(listingData.id);
                invalidateByUser(user.id);
                await refetchListing();
            }
        } catch (error) {
            if (nextStatus === "active") {
                console.error("Error publishing listing:", error);
                await showAlert("Error", "Failed to publish listing. Please try again.");
            } else {
                console.error("Error unpublishing listing:", error);
                await showAlert("Error", "Failed to unpublish listing. Please try again.");
            }
        } finally {
            setPublishLoading(false);
        }
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

    useEffect(() => {
        if (!listingData) return;
        setSelectedStatus(toOwnerStatus(listingData.status));
    }, [listingData]);

    if (unavailableMessage) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50" onClick={() => navigate(-1)} />

                <section className="relative z-10 w-full max-w-190">
                    <div className="overflow-hidden rounded-b-2xl rounded-t-none shadow-xl" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}>
                        <div className="bg-gradient-to-r from-[var(--color-primary-dark)] to-[var(--color-primary)] px-5 py-6 text-center sm:px-6">
                            <p className="text-2xl font-semibold text-[var(--color-text-on-primary)]">{unavailableMessage}</p>
                        </div>
                        <div className="px-5 py-5 text-center sm:px-6">
                            <button
                                type="button"
                                className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text)" }}
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
        return <div className="flex h-screen items-center justify-center" style={{ color: "var(--color-text)" }}>Loading...</div>
    }

    if (showForm) {
        return (
            <Form
                showForm={true}
                user={user}
                editListing={listingData}
                onClose={() => navigate(-1)}
                onSubmitSuccess={() => {
                    invalidateDetail(listingData.id);
                    invalidateByUser(user!.id);
                    navigate(-1);
                }}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => navigate(-1)} />

            <section className="relative z-10 w-full max-w-190">
                <div className="max-h-[92vh] overflow-y-auto rounded-b-2xl rounded-t-none p-5 shadow-xl sm:p-6" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}>
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
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text)" }}>Product Image</p>
                            <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed p-5 text-center text-sm uppercase" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text-muted)" }}>
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
                                className="mt-2 inline-block text-sm font-medium text-[var(--color-primary-dark)] hover:underline"
                            >
                                Owned by {sellerProfile?.display_name ?? ""}
                            </Link>
                            {user && listingData.user_id === user.id ? (
                                <div className="mt-4">
                                    <ListingManagementPanel
                                        status={selectedStatus}
                                        onStatusChange={applyStatusChange}
                                        onEdit={editListing}
                                        onDelete={handleDelete}
                                        publishLoading={publishLoading}
                                        deleteLoading={deleteLoading}
                                        soldLoading={soldLoading}
                                        statusLocked={statusLocked}
                                    />
                                </div>
                            ) : null}
                        </div>

                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text)" }}>Price</p>
                                    <div className="rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text)" }}>
                                        {listingData?.price_unit ?? "$"}
                                        {listingData?.price ?? "0"}
                                    </div>
                                </div>
                                <div>
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text)" }}>Category</p>
                                    <div className="rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text)" }}>
                                        {listingData?.category_name ?? "Uncategorized"}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {listingData.type === "item" ? (
                                    <>
                                        <div>
                                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text)" }}>Condition</p>
                                            <div className="rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text)" }}>
                                                {listingData.item_details?.condition ?? "N/A"}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text)" }}>Quantity</p>
                                            <div className="rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text)" }}>
                                                {listingData.item_details?.quantity ?? "N/A"}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text)" }}>Duration (minutes)</p>
                                            <div className="rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text)" }}>
                                                {listingData.service_details?.duration_minutes ?? "N/A"}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text)" }}>Available From</p>
                                            <div className="rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text)" }}>
                                                {listingData.service_details?.available_from ?? "N/A"}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {listingData.type === "service" ? (
                                    <div>
                                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text)" }}>Available To</p>
                                        <div className="rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text)" }}>
                                            {listingData.service_details?.available_to ?? "N/A"}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text)" }}>Type</p>
                                        <div className="rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text)" }}>
                                            {listingData.type}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text)" }}>Date Posted</p>
                                    <div className="rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text)" }}>
                                        {formatDateTime(listingData.created_at)}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text)" }}>Location</p>
                                <div className="rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text)" }}>
                                    {listingData?.location ?? "N/A"}
                                </div>
                            </div>

                            <div>
                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-text)" }}>Description</p>
                                <div className="min-h-36 rounded-lg border px-3 py-3 text-sm" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text)" }}>
                                    {listingData?.description ?? "No description provided."}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
                            <button
                                type="button"
                                className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text)" }}
                                onClick={() => navigate(-1)}
                            >
                                Back
                            </button>

                            {/* Only show "Message Seller" if logged in and not viewing your own listing */}
                            {user && listingData.user_id !== user.id && (
                                <button
                                    type="button"
                                    disabled={messagingLoading}
                                    className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-background)", color: "var(--color-text)" }}
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
                                    className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                                    style={{
                                        borderColor: "var(--color-border)",
                                        backgroundColor: isInWishlist ? "var(--color-surface)" : "var(--color-background)",
                                        color: "var(--color-text)",
                                    }}
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