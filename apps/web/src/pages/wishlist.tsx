import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router";
import  type { SessionUser } from "../features/types.ts";

type OutletContext = {
    user: SessionUser | null;
    openPostForm: () => void;
};

const deleteWishlistItem = (id: string, items: any[]) => { // delete wishlist item by id from user wishlist
    return items.filter((wishlistItem: any) => wishlistItem.id !== id);
};

export default function Wishlist() {
    const navigate = useNavigate();
    const { user } = useOutletContext<OutletContext>();
    const wishlistItems = localStorage.getItem("wishlist") ? JSON.parse(localStorage.getItem("wishlist")!) : [];
    const [loading, setLoading] = useState(false);
    const [hasitems, setHasItems] = useState(wishlistItems.length > 0);

    useEffect(() => {
        setLoading(true);

        if (!user) {
            setLoading(false);
            navigate("/login");
            return;
        }
        setHasItems(wishlistItems.length > 0);
        setLoading(false);

    }, [user, wishlistItems.length]);

    return (
        <div className="min-h-screen p-4">
            <div className="mx-auto max-w-6xl">
                <h1 className="mb-6 text-2xl font-bold">Your Wishlist</h1>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <section>
                        {loading ? (
                            <p>Loading...</p>
                        ) : hasitems ? (
                            <div className="space-y-4">
                                {wishlistItems.map((item: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between rounded bg-white p-4 shadow-sm">
                                        <button
                                            aria-label="Remove item"
                                            className="rounded bg-red-500 p-2 text-white"
                                            onClick={() => {
                                                const updatedWishlist = deleteWishlistItem(item.id, wishlistItems);
                                                localStorage.setItem("wishlist", JSON.stringify(updatedWishlist));
                                                setHasItems(updatedWishlist.length > 0);
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                                                <path fillRule="evenodd" d="M9 3.75A2.25 2.25 0 0 1 11.25 1.5h1.5A2.25 2.25 0 0 1 15 3.75V4.5h3.75a.75.75 0 0 1 0 1.5h-.69l-.86 12.032A2.25 2.25 0 0 1 14.96 20.25H9.04a2.25 2.25 0 0 1-2.24-2.218L5.94 6H5.25a.75.75 0 0 1 0-1.5H9v-.75ZM10.5 4.5h3v-.75a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0-.75.75v.75Zm-.75 4.5a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0v-6a.75.75 0 0 1 .75-.75Zm4.5.75a.75.75 0 0 0-1.5 0v6a.75.75 0 0 0 1.5 0v-6Z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        <div>
                                            <h2 className="text-lg font-semibold">{item.title}</h2>
                                            <p className="text-gray-600">{item.description}</p>
                                            <p className="text-gray-800 font-bold">${item.price}</p>
                                        </div>

                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>Your wishlist is empty.</p>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}