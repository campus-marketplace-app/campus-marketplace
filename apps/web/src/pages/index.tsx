import { searchListings } from "@campus-marketplace/backend";
import { useEffect } from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";
import { useState } from "react";
import type { Listing } from "@campus-marketplace/backend";

type OutletContext = {
    searchQuery: string;
    listingsRefreshKey: number;
};

export default function Index() {
    const location = useLocation();
    const { searchQuery, listingsRefreshKey } = useOutletContext<OutletContext>();
    const [listingsData, setListingsData] = useState<Array<Listing>>([]);
    const [isloading, setIsLoading] = useState(true);
    const [category, setCategory] = useState<string>("");
    const [listingType, setListingType] = useState<"" | "item" | "service">("");

    useEffect(() => {
        const fetchListings = async () => {
            setIsLoading(true);
            try {
                const searchTrimmed = searchQuery.trim();
                const options: {
                    query?: string;
                    category_id?: string;
                    type?: "item" | "service";
                } = {};

                if (searchTrimmed !== "") {
                    options.query = searchTrimmed;
                }
                if (category !== "") {
                    options.category_id = category;
                }
                if (listingType !== "") {
                    options.type = listingType;
                }

                const data = await searchListings(options);

                if (data !== null && (JSON.stringify(data) !== JSON.stringify(listingsData))) {
                    setListingsData(data);
                }
            } catch (error) {
                console.error("Error fetching listings:", error);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchListings();
    }, [category, listingType, searchQuery, listingsRefreshKey]);

    return (
        <section className="p-6 sm:p-8">
            <div className="mb-10 flex flex-wrap items-end gap-3">
                <div className="w-full max-w-[13rem]">
                    <label htmlFor="listing-type-filter" className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-black/80">
                        Type
                    </label>
                    <select
                        id="listing-type-filter"
                        className="w-full rounded-2xl border border-black/15 bg-white px-4 py-3 text-lg text-black shadow-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
                        value={listingType}
                        onChange={(e) => setListingType(e.target.value as "" | "item" | "service")}
                    >
                        <option value="">All types</option>
                        <option value="item">Item</option>
                        <option value="service">Service</option>
                    </select>
                </div>

                <div className="w-full max-w-[15rem]">
                    <label htmlFor="category-filter" className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-black/80">
                        Category
                    </label>
                    <select
                        id="category-filter"
                        className="w-full rounded-2xl border border-black/15 bg-white px-4 py-3 text-lg text-black shadow-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
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
                        <option value="be4cc965-718d-4e7d-939f-9ace4dcc837c">Sports & Fitness</option>
                        <option value="cf2121d7-22b7-4e87-ab1b-801d55ebd4fe">Services</option>
                        <option value="dc2b319a-1068-4b06-bcb3-11c1f3dd3fa2">Textbooks</option>
                        <option value="744ab09f-350d-4f75-8b4a-cb84016545ef">Other</option>
                    </select>
                </div>
            </div>

            <p className="mb-10 text-3xl">CATEGORIES</p>
            {isloading ? (<h2 >Loading...</h2>) : (
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
                    {listingsData.map((listing) => (
                        <Link
                            key={listing.id}
                            to={`/listing/${listing.id}`}
                            state={{ backgroundLocation: location }}
                            className="block rounded-lg p-2 text-center transition hover:bg-white/50 hover:shadow-md focus:outline-color=none focus-visible:ring-2 focus-visible:ring-black"
                        >
                            <article className="rounded-lg border border-black bg-white p-4 text-center text-black">
                                <div className="mx-auto mb-2 flex h-32 w-32 items-center justify-center bg-[var(--color-accent-muted)] text-[10px] text-black">
                                    'img'
                                </div>
                                <p className="text-3xl leading-none">{listing.title}</p>
                                <p className="text-lg leading-none">{listing.price}</p>
                            </article>
                        </Link>
                    ))}
                </div>)}
        </section>
    );
}