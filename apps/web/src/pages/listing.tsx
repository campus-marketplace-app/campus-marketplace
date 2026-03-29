import { useEffect, useState } from "react";
import { useNavigate, useParams, useOutletContext, Link } from "react-router-dom";
import { getListingWithDetails, createConversation, ensureFreshSession, getProfile, publishListing, unpublishListing, deleteListing, getListingImageUrl, getListingPublishReadiness } from "@campus-marketplace/backend";
import type { OutletContext } from "../features/types";
import Form from "../features/form";


export default function Listing() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user, listingsRefreshKey } = useOutletContext<OutletContext>();
    const [listingData, setListingData] = useState<any>(null);
    const [messagingLoading, setMessagingLoading] = useState(false);
    const [displayName, setDisplayName] = useState<string>("");
    const [publishLoading, setPublishLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);

    const formatDateTime = (value?: string | null) => {
        if (!value) return "N/A";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString();
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
            alert("You must be logged in to publish a listing.");
            navigate("/login");
            return;
        }
        await refreshTokens();
        if (listingData.user_id !== user.id) {
            alert("You can only publish your own listings.");
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
                    alert(`This listing cannot be published yet. Please add:\n- ${missingLabels.join("\n- ")}`);
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
        listingsRefreshKey + 1;
    };

    const handleDelete = async () => {
        if (!listingData) return;
        if (!user) {
            alert("You must be logged in to delete a listing.");
            navigate("/login");
            return;
        }
        await refreshTokens();
        if (listingData.user_id !== user.id) {
            alert("You can only delete your own listings.");
            return;
        }
        if (!window.confirm("Are you sure you want to delete this listing? This action cannot be undone.")) {
            return;
        }
        setDeleteLoading(true);
        try {
            await deleteListing(listingData.id, user?.id);
            alert("Listing deleted successfully.");
            navigate("/");
        } catch (error) {
            console.error("Error deleting listing");
            alert("Failed to delete listing. Please try again.");
        } finally {
            setDeleteLoading(false);
        }
        listingsRefreshKey + 1;
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
                let account = await getProfile(listing.user_id);
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
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-gray-600/55" onClick={() => navigate(-1)} />

                <section className="relative z-10 w-full max-w-xl p-6 sm:p-8">
                    <div className="rounded-sm bg-[#a50f1a] p-8 text-center shadow-lg sm:p-10">
                        <p className="text-2xl font-semibold text-white">{unavailableMessage}</p>
                        <button
                            type="button"
                            className="mt-6 bg-[#f1b7be] px-8 py-2 text-xl text-black transition hover:bg-white"
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
        return <div className="flex h-screen items-center justify-center text-white">Loading...</div>;
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
                <div className="mx-auto max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-sm bg-[#a50f1a] p-6 shadow-lg sm:p-10">
                    <div className="space-y-8">
                        <div className="mx-auto w-full max-w-sm">
                            <p className="mb-2 text-center text-sm font-semibold uppercase tracking-wide text-white">Title</p>
                            <div className="rounded-2xl bg-white px-4 py-3 text-center text-3xl text-black">
                                {listingData?.title ?? "Untitled listing"}
                            </div>
                        </div>

                        <div className="grid gap-8 md:grid-cols-[1.1fr_1.4fr]">
                            <div>
                                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-white">Product Image</p>
                                <div className="flex min-h-72 items-center justify-center rounded-xl bg-[#f1b7be] p-6 text-center text-sm uppercase text-black">
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
                                    Owned by {displayName}
                                </Link>
                                {user && listingData.user_id === user.id ? (
                                    <div className="mt-4 flex flex-col items-start gap-2">
                                        <button
                                            className="inline-flex rounded-xl bg-[#f1b7be] px-4 py-2 text-sm text-black transition hover:bg-white"
                                            type="button"
                                            onClick={editListing}
                                        >
                                            Edit Listing
                                        </button>
                                        <button className="inline-flex rounded-xl bg-[#f1b7be] px-4 py-2 text-sm text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
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
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Price</p>
                                        <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                            {listingData?.price_unit ?? "$"}
                                            {listingData?.price ?? "0"}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Category</p>
                                        <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                            {listingData?.category_name ?? "Uncategorized"}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {listingData.type === "item" ? (
                                        <>
                                            <div>
                                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Condition</p>
                                                <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                                    {listingData.item_details?.condition ?? "N/A"}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Quantity</p>
                                                <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                                    {listingData.item_details?.quantity ?? "N/A"}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Duration (minutes)</p>
                                                <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                                    {listingData.service_details?.duration_minutes ?? "N/A"}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Available From</p>
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
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Available To</p>
                                            <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                                {listingData.service_details?.available_to ?? "N/A"}
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Type</p>
                                            <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                                {listingData.type}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Date Posted</p>
                                        <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                            {formatDateTime(listingData.created_at)}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Location</p>
                                    <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                        {listingData?.location ?? "N/A"}
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Description</p>
                                    <div className="min-h-36 rounded-2xl bg-white px-4 py-4 text-sm text-black">
                                        {listingData?.description ?? "No description provided."}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-8">
                            <button
                                type="button"
                                className="bg-[#f1b7be] px-8 py-2 text-2xl text-black transition hover:bg-white"
                                onClick={() => navigate(-1)}
                            >
                                back
                            </button>

                            {/* Only show "Message Seller" if logged in and not viewing your own listing */}
                            {user && listingData.user_id !== user.id && (
                                <button
                                    type="button"
                                    disabled={messagingLoading}
                                    className="bg-[#f1b7be] px-8 py-2 text-2xl text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
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
                                                alert("Your session has expired. Please log in again.");
                                                navigate("/login");
                                            } else {
                                                alert("Could not start conversation. Please try again.");
                                            }
                                        } finally {
                                            setMessagingLoading(false);
                                        }
                                    }}
                                >
                                    {messagingLoading ? "Opening..." : "Message Seller"}
                                </button>
                            )}

                            <button
                                type="button"
                                className="bg-[#f1b7be] px-8 py-2 text-2xl text-black transition hover:bg-white"
                            >
                                cart
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}