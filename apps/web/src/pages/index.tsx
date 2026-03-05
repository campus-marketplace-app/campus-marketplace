import { Link, useLocation } from "react-router-dom";

const listingPlaceholders = [
    { id: 1, imageLabel: "LISTING_IMAGES.path", title: "LISTINGS.title", price: "LISTINGS.price" },
    { id: 2, imageLabel: "picture of product", title: "LISTINGS.title", price: "LISTINGS.price" },
    { id: 3, imageLabel: "LISTING_IMAGES.path", title: "LISTINGS.title", price: "LISTINGS.price" },
    { id: 4, imageLabel: "LISTING_IMAGES.path", title: "LISTINGS.title", price: "LISTINGS.price" },
];

export default function Index() {
    const location = useLocation();

    return (
        <section className="p-6 sm:p-8">
            <p className="mb-8 text-2xl">search filter</p>
            <p className="mb-10 text-3xl">CATEGORIES</p>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
                {listingPlaceholders.map((listing) => (
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