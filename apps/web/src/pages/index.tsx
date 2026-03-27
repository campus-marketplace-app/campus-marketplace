import { searchListings } from "@campus-marketplace/backend";
import { useEffect } from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";
import { useState } from "react";
import type { Listing } from "@campus-marketplace/backend";

type OutletContext = {
    searchQuery: string;
};

export default function Index() {
    const location = useLocation();
    const { searchQuery } = useOutletContext<OutletContext>();
    const [listingsData, setListingsData] = useState<Array<Listing>>([]);
    const [isloading, setIsLoading] = useState(true);
    const [category, setCategory] = useState<string>("");

    useEffect(() => {
        const fetchListings = async () => {
            setIsLoading(true);
            try {
                if (searchQuery !== "" && category !== "") {
                    const data = await searchListings({ query: searchQuery, category_id: category });
                    if (data !== null && (JSON.stringify(data) !== JSON.stringify(listingsData))) {
                        setListingsData(data);
                    }
                }
                else if (category !== "" && searchQuery === "") {
                    const data = await searchListings({ category_id: category });
                    if (data !== null && (JSON.stringify(data) !== JSON.stringify(listingsData))) {
                        setListingsData(data);
                    }
                } else if (searchQuery !== "" && category === "") {
                    const data = await searchListings({ query: searchQuery });
                    if (data !== null && (JSON.stringify(data) !== JSON.stringify(listingsData))) {
                        setListingsData(data);
                    }
                } else {
                    const data = await searchListings();
                    if (data !== null && (JSON.stringify(data) !== JSON.stringify(listingsData))) {
                        setListingsData(data);
                        console.log("Listings data:", data);
                    }
                }
            } catch (error) {
                console.error("Error fetching listings:", error);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchListings();
    }, [category, searchQuery]);

    return (isloading ? (<h2 >Loading...</h2>) : (
        <section className="p-6 sm:p-8">
            <p className="mb-10 text-1xl font-semibold uppercase tracking-wide text-black">FILTER</p>
                <select id="filter" className="mb-8 rounded border border-black bg-white px-4 py-2 text-2xl text-black" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">--</option>
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
            
            <p className="mb-10 text-3xl">CATEGORIES</p>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
                {listingsData.map((listing) => (
                    <Link
                        key={listing.id}
                        to={`/listing/${listing.id}`}
                        state={{ backgroundLocation: location }}
                        className="block rounded-lg p-2 text-center transition hover:bg-white/50 hover:shadow-md focus:outline-color=none focus-visible:ring-2 focus-visible:ring-black"
                    >
                        <article className="rounded-lg border border-black bg-white p-4 text-center text-black">
                            <div className="mx-auto mb-2 flex h-32 w-32 items-center justify-center bg-[#cc7f84] text-[10px] text-black">
                                'img'
                            </div>
                            <p className="text-3xl leading-none">{listing.title}</p>
                            <p className="text-lg leading-none">{listing.price}</p>
                        </article>
                    </Link>
                ))}
            </div>
        </section>
    ));
}