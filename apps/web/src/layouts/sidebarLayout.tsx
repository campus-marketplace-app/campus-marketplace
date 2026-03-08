import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Navbar from '../navbar/navbar';

export default function SidebarLayout() {
    const [showForm, setShowForm] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;

        if (showForm) {
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [showForm]);

    return (
        <div className="flex flex-col h-screen">
            {/* Top Navbar */}
            <nav className="bg-red-700 p-4 w-full">
                <Navbar />
            </nav>

            <div className="flex flex-1 overflow-hidden bg-[#ececec]">
                <aside
                    className={`relative shrink-0 bg-[#8f0010] text-black transition-all duration-300 ${
                        isSidebarOpen ? 'w-36 sm:w-40' : 'w-16'
                    }`}
                >
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen((prev) => !prev)}
                        className="absolute right-2 top-2 rounded border border-black bg-[#f6d3d6] px-2 py-1 text-sm font-semibold text-black hover:bg-white"
                        aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        {isSidebarOpen ? '<' : '>'}
                    </button>

                    <div className="flex h-full flex-col items-center justify-between py-14">
                        {isSidebarOpen ? (
                            <ul className="space-y-6 text-center text-xl">
                                <li>
                                    <NavLink
                                        to="/"
                                        end
                                        className={({ isActive }) =>
                                            `block rounded-lg px-4 py-2 font-semibold transition ${
                                                isActive
                                                    ? 'bg-white/25 text-white shadow-sm'
                                                    : 'text-white hover:bg-white/15 hover:text-white'
                                            }`
                                        }
                                    >
                                        Home
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink
                                        to="/profile"
                                        state={{ backgroundLocation: location }}
                                        className={({ isActive }) =>
                                            `block rounded-lg px-4 py-2 font-semibold transition ${
                                                isActive
                                                    ? 'bg-white/25 text-white shadow-sm'
                                                    : 'text-white hover:bg-white/15 hover:text-white'
                                            }`
                                        }
                                    >
                                        Profile
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink
                                        to="/messages"
                                        className={({ isActive }) =>
                                            `block rounded-lg px-4 py-2 font-semibold transition ${
                                                isActive
                                                    ? 'bg-white/25 text-white shadow-sm'
                                                    : 'text-white hover:bg-white/15 hover:text-white'
                                            }`
                                        }
                                    >
                                        Messages
                                    </NavLink>
                                </li>
                            </ul>
                        ) : (
                            <div />
                        )}
                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => setShowForm(true)}
                                className={`rounded-xl border-2 border-black bg-[#f6d3d6] text-xl font-semibold text-black shadow-[4px_4px_0_#000] transition hover:-translate-y-0.5 hover:bg-white ${
                                    isSidebarOpen ? 'px-7 py-3' : 'px-3 py-2'
                                }`}
                            >
                                {isSidebarOpen ? 'Post' : '+'}
                            </button>
                        </div>
                    </div>
                </aside>

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
                                        placeholder="LISTINGS.title"
                                        className="w-full bg-transparent text-center text-3xl outline-none placeholder:text-black"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-8 md:grid-cols-[1.1fr_1.4fr]">
                                <div>
                                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-white">Product Image</p>
                                    <div className="flex min-h-72 items-center justify-center bg-[#f1b7be] p-6 text-center text-sm uppercase text-black">
                                        picture of the product
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
                                                placeholder="LISTINGS.price_unit"
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
                                                placeholder="LISTINGS.category"
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
                                                placeholder="LISTINGS.condition"
                                                className="w-full rounded-xl bg-white px-4 py-3 text-sm outline-none placeholder:text-black"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="extra" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white">
                                                Extra
                                            </label>
                                            <input
                                                id="extra"
                                                type="text"
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
                                            placeholder="LISTINGS.description"
                                            rows={5}
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