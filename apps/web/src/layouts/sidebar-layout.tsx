import { useEffect, useState, type ChangeEvent } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PageHeader from '../features/page-header';
import Navbar from '../features/navbar';
import { getSessionFromTokens } from "@campus-marketplace/backend";

const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

export default function SidebarLayout() {
    const [isLoggedIn] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [listingTitle, setListingTitle] = useState('LISTINGS.title');
    const [listingPrice, setListingPrice] = useState('LISTINGS.price_unit');
    const [listingCategory, setListingCategory] = useState('LISTINGS.category');
    const [listingCondition, setListingCondition] = useState('LISTINGS.condition');
    const [listingDate, setListingDate] = useState(getCurrentDateTimeLocal);
    const [listingDescription, setListingDescription] = useState('LISTINGS.description');
    const [listingImageLabel, setListingImageLabel] = useState('picture of the product');
    const location = useLocation();
    const isRegistering = !['/login', '/signup'].includes(location.pathname);
    const [user, setUser] = useState<object | null>(null);

    const handleListingImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setListingImageLabel(selectedFile.name);
        }
    };

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;

        if (showForm) {
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [showForm]);

    useEffect(() => {
        const checkUserSession = async () => {
            try {
                let accessToken = localStorage.getItem("access_token");
                let refreshToken = localStorage.getItem("refresh_token");
                if (!accessToken || !refreshToken) {
                    console.log("User is not logged in.");
                    return;
                }

                const {user, session} = await getSessionFromTokens(accessToken, refreshToken);
                if (session) {
                    setUser(user);
                } else {
                    console.log("User is not logged in.");
                }


            } catch {
                console.log("User is not logged in.");
            }
        };

        void checkUserSession();
    }, []);

    return (
        <div className="flex flex-col h-screen">
            <PageHeader
                isLoggedIn={isLoggedIn}
                isRegistering={isRegistering}
            />

            <div className="flex flex-1 overflow-hidden bg-[#ececec]">
                {isRegistering ? <aside
                    className={`relative shrink-0 bg-[#8f0010] text-black transition-all duration-300 ${isSidebarOpen ? 'w-36 sm:w-40' : 'w-16'
                        }`}
                >
                    <Navbar
                        isSidebarOpen={isSidebarOpen}
                        toggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
                        openPostForm={() => setShowForm(true)}
                        location={location}
                    />
                </aside> : null}

                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowForm(false)}
                    />

                    <div className="relative z-10 mx-4 w-full max-w-4xl rounded-sm bg-[#a50f1a] p-6 shadow-lg sm:p-10">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                            }}
                            className="space-y-8"
                        >
                            <div className="mx-auto w-full max-w-sm">
                                <label htmlFor="title" className="mb-2 block text-center text-sm font-semibold uppercase tracking-wide text-white">
                                    Title
                                </label>
                                <div className="rounded-2xl bg-white px-4 py-3 text-center text-3xl">
                                    <input
                                        id="title"
                                        type="text"
                                        value={listingTitle}
                                        onChange={(e) => setListingTitle(e.target.value)}
                                        className="w-full bg-transparent text-center text-3xl outline-none placeholder:text-black"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-8 md:grid-cols-[1.1fr_1.4fr]">
                                <div>
                                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-white">Product Image</p>
                                    <div className="flex min-h-72 flex-col items-center justify-center gap-4 bg-[#f1b7be] p-6 text-center text-sm uppercase text-black">
                                        <span>{listingImageLabel}</span>
                                        <label className="cursor-pointer rounded bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-neutral-100">
                                            Choose Image
                                            <input type="file" accept="image/*" className="hidden" onChange={handleListingImageChange} />
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="price" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                                Price
                                            </label>
                                            <input
                                                id="price"
                                                type="text"
                                                value={listingPrice}
                                                onChange={(e) => setListingPrice(e.target.value)}
                                                className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none placeholder:text-black"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="category" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                                Category
                                            </label>
                                            <input
                                                id="category"
                                                type="text"
                                                value={listingCategory}
                                                onChange={(e) => setListingCategory(e.target.value)}
                                                className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none placeholder:text-black"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="condition" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                                Condition
                                            </label>
                                            <input
                                                id="condition"
                                                type="text"
                                                value={listingCondition}
                                                onChange={(e) => setListingCondition(e.target.value)}
                                                className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none placeholder:text-black"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="date" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                                Date
                                            </label>
                                            <input
                                                id="date"
                                                type="datetime-local"
                                                value={listingDate}
                                                onChange={(e) => setListingDate(e.target.value)}
                                                className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="description" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                            Description
                                        </label>
                                        <textarea
                                            id="description"
                                            rows={5}
                                            value={listingDescription}
                                            onChange={(e) => setListingDescription(e.target.value)}
                                            className="w-full resize-none rounded-2xl bg-white px-4 py-4 text-sm outline-none placeholder:text-black"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-8">
                                <button
                                    type="button"
                                    className="bg-[#f1b7be] px-8 py-2 text-2xl text-black transition hover:bg-white"
                                    onClick={() => setShowForm(false)}
                                >
                                    back
                                </button>
                                <button
                                    type="submit"
                                    className="bg-[#f1b7be] px-8 py-2 text-2xl text-black transition hover:bg-white"
                                >
                                    upload
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}