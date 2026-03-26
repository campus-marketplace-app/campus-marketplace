import { searchListings } from "@campus-marketplace/backend";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

export default function Index() {
    const location = useLocation();
    const [listingsData, setListingsData] = useState<Array<any>>([]);

    useEffect(() => {
        const fetchListings = async () => {
            try {
                const data = await searchListings();
                setListingsData(data);
                console.log("Listings data:", data);
            } catch (error) {
                console.error("Error fetching listings:", error);
            }
        };
        fetchListings();
    }, []);

    return (
        <section className="p-6 sm:p-8">
            <select className="mb-8 text-2xl">search filter
                <option value="">--</option>
                <option value="New">New</option>
                <option value="Nearly_new">Nearly New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
            </select>
            <p className="mb-10 text-3xl">CATEGORIES</p>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
                {listingsData.map((listing) => (
                    <Link
                        key={listing.id}
                        to={`/listing/${listing.id}`}
                        state={{ backgroundLocation: location }}
                        className="block rounded-lg p-2 text-center transition hover:bg-white/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                    >
                        <article>
                            <div className="mx-auto mb-2 flex h-32 w-32 items-center justify-center bg-[#cc7f84] text-[10px] text-black">
                                {listing.imageLabel}
                            </div>
                            <p className="text-3xl leading-none">{listing.title}</p>
                            <p className="text-lg leading-none">{listing.price}</p>
                        </article>
                    </Link>
                ))}
            </div>
        </section>
    );
}