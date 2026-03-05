import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

const productData = {
    1: {
        title: "Used Textbook - Biology",
        imageLabel: "PICTURE OF THE PRODUCT",
        priceUnit: "$35",
        category: "Books",
        condition: "Good",
        extra: "Pickup on campus",
        description: "Clean copy with light highlighting in two chapters. Great for BIOL 101.",
    },
    2: {
        title: "Desk Lamp",
        imageLabel: "PICTURE OF THE PRODUCT",
        priceUnit: "$25",
        category: "Furniture",
        condition: "Like New",
        extra: "LED bulb included",
        description: "Adjustable lamp, warm and cool modes, and USB charging port.",
    },
    3: {
        title: "Graphing Calculator",
        imageLabel: "PICTURE OF THE PRODUCT",
        priceUnit: "$45",
        category: "Electronics",
        condition: "Used",
        extra: "Fresh batteries",
        description: "Fully functional TI-style graphing calculator for math and engineering classes.",
    },
    4: {
        title: "Campus Hoodie",
        imageLabel: "PICTURE OF THE PRODUCT",
        priceUnit: "$20",
        category: "Accessories",
        condition: "Excellent",
        extra: "Size M",
        description: "Soft fleece hoodie with university logo, worn only a few times.",
    },
};

type ProductKey = keyof typeof productData;

export default function Listing() {
    const navigate = useNavigate();
    const { id } = useParams();

    const product = useMemo(() => {
        const parsedId = Number(id);
        if (parsedId && parsedId in productData) {
            return productData[parsedId as ProductKey];
        }

        return productData[1];
    }, [id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-gray-600/55" onClick={() => navigate(-1)} />

            <section className="relative z-10 w-full p-6 sm:p-8">
                <div className="mx-auto w-full max-w-4xl rounded-sm bg-[#a50f1a] p-6 shadow-lg sm:p-10">
                <div className="space-y-8">
                    <div className="mx-auto w-full max-w-sm">
                        <p className="mb-2 text-center text-sm font-semibold uppercase tracking-wide text-white">Title</p>
                        <div className="rounded-2xl bg-white px-4 py-3 text-center text-3xl text-black">
                            {product.title}
                        </div>
                    </div>

                    <div className="grid gap-8 md:grid-cols-[1.1fr_1.4fr]">
                        <div>
                            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-white">Product Image</p>
                            <div className="flex min-h-72 items-center justify-center rounded-xl bg-[#f1b7be] p-6 text-center text-sm uppercase text-black">
                                {product.imageLabel}
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Price</p>
                                    <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">{product.priceUnit}</div>
                                </div>
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Category</p>
                                    <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">{product.category}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Condition</p>
                                    <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">{product.condition}</div>
                                </div>
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Extra</p>
                                    <div className="rounded-xl bg-white px-4 py-3 text-sm text-black">{product.extra}</div>
                                </div>
                            </div>

                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white">Description</p>
                                <div className="min-h-36 rounded-2xl bg-white px-4 py-4 text-sm text-black">{product.description}</div>
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