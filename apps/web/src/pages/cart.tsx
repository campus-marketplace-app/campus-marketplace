import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router";
import  type { SessionUser } from "../features/types.ts";

type OutletContext = {
    user: SessionUser | null;
    openPostForm: () => void;
};

const deleteCartItem = (id: string, items: any[]) => { // delete cart item by id from user cart
    return items.filter((cartItem: any) => cartItem.id !== id);
};

export default function Cart() {
    const navigate = useNavigate();
    const { user } = useOutletContext<OutletContext>();
    const cartItems = localStorage.getItem("cart") ? JSON.parse(localStorage.getItem("cart")!) : [];
    const totalPrice = cartItems.reduce((sum: number, item: any) => sum + Number(item?.price || 0), 0);
    const [loading, setLoading] = useState(false);
    const [hasitems, setHasItems] = useState(cartItems.length > 0);

    useEffect(() => {
        setLoading(true);

        if (!user) {
            setLoading(false);
            navigate("/login");
            return;
        }
        setHasItems(cartItems.length > 0);
        setLoading(false);

    }, [user, cartItems.length]);

    return (
        <div className="min-h-screen p-4">
            <div className="mx-auto max-w-6xl">
                <h1 className="mb-6 text-2xl font-bold">Your Cart</h1>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <section>
                        {loading ? (
                            <p>Loading...</p>
                        ) : hasitems ? (
                            <div className="space-y-4">
                                {cartItems.map((item: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between rounded bg-white p-4 shadow-sm">
                                        <button
                                            aria-label="Remove item"
                                            className="rounded bg-red-500 p-2 text-white"
                                            onClick={() => {
                                                const updatedCart = deleteCartItem(item.id, cartItems);
                                                localStorage.setItem("cart", JSON.stringify(updatedCart));
                                                setHasItems(updatedCart.length > 0);
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
                            <p>Your cart is empty.</p>
                        )}
                    </section>

                    <aside className="h-fit rounded bg-white p-4 shadow-sm lg:sticky lg:top-4">
                        <h2 className="mb-4 text-xl font-bold">Order Summary</h2>
                        <p className="mb-4 text-lg">Total: ${totalPrice.toFixed(2)}</p>
                        <button
                            className="w-full rounded bg-green-500 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => alert("Checkout functionality not implemented yet.")}
                            disabled={cartItems.length === 0}
                        >
                            Checkout
                        </button>
                    </aside>
                </div>
            </div>
        </div>
    );
}