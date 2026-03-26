import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getListingWithDetails } from "@campus-marketplace/backend";


export default function Listing() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [listingData, setListingData] = useState<any>(null);

    useEffect(() => {
        if (!id) {
            navigate("/", { replace: true });
            return;
        }

        console.log("Listing ID from URL:", id as string);

        const callback = async () => {
            try {
                const listing = await getListingWithDetails(id as string);

                console.log("Listing details:", listing);

                if (!id) {
                    navigate("/", { replace: true });
                    return;
                }

                setListingData(listing);
            } catch (error) {
                console.error("Error fetching listing details:", error);
                navigate("/", { replace: true });
            }
        };
        callback();
    }, [id, navigate]);

    if (!listingData) {
        return <div className="flex h-screen items-center justify-center text-white">Loading...</div>;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-gray-600/55" onClick={() => navigate(-1)} />

            <section className="relative z-10 w-full p-6 sm:p-8">
                <div className="mx-auto w-full max-w-4xl rounded-sm bg-[#a50f1a] p-6 shadow-lg sm:p-10">
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
                                    {listingData?.images?.[0]?.alt_text ?? "PICTURE OF THE PRODUCT"}
                                </div>
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
                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Condition</p>
                                        <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                            {listingData?.item_details?.condition ?? "N/A"}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Date Posted</p>
                                        <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">
                                            {listingData?.created_at ?? "N/A"}
                                        </div>
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