import { NavLink, type Location } from 'react-router-dom';

type NavbarProps = {
    isSidebarOpen: boolean;
    isloggedIn: boolean;
    toggleSidebar: () => void;
    openPostForm: () => void;
    location: Location;
    user?: unknown | null;
    logout: () => void;
};

export default function Navbar({
    isSidebarOpen,
    isloggedIn,
    toggleSidebar,
    openPostForm,
    location,
    logout,
}: NavbarProps) {
    return (
        <>
            <button
                type="button"
                onClick={toggleSidebar}
                className="absolute right-2 top-2 rounded border border-black bg-[var(--color-accent-light)] px-2 py-1 text-sm font-semibold text-black hover:bg-white"
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
                                    `block rounded-lg px-4 py-2 font-semibold transition ${isActive
                                        ? 'bg-white/25 text-[var(--color-text-on-primary)] shadow-sm'
                                        : 'text-[var(--color-text-on-primary)] hover:bg-white/15'
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
                                    `block rounded-lg px-4 py-2 font-semibold transition ${isActive
                                        ? 'bg-white/25 text-[var(--color-text-on-primary)] shadow-sm'
                                        : 'text-[var(--color-text-on-primary)] hover:bg-white/15'
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
                                    `block rounded-lg px-4 py-2 font-semibold transition ${isActive
                                        ? 'bg-white/25 text-[var(--color-text-on-primary)] shadow-sm'
                                        : 'text-[var(--color-text-on-primary)] hover:bg-white/15'
                                    }`
                                }
                            >
                                Messages
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/my-listings"
                                className={({ isActive }) =>
                                    `block rounded-lg px-4 py-2 font-semibold transition ${isActive
                                        ? 'bg-white/25 text-[var(--color-text-on-primary)] shadow-sm'
                                        : 'text-[var(--color-text-on-primary)] hover:bg-white/15'
                                    }`
                                }
                            >
                                My Listings
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/login"
                                className={({ isActive }) =>
                                    `block rounded-lg px-4 py-2 font-semibold transition ${isActive
                                        ? 'bg-white/25 text-[var(--color-text-on-primary)] shadow-sm'
                                        : 'text-[var(--color-text-on-primary)] hover:bg-white/15'
                                    }`
                                }
                                onClick={logout}
                            >
                                {isloggedIn ? 'Logout' : 'Login'}
                            </NavLink>
                        </li>
                    </ul>
                ) : (
                    <div />
                )}
                {isloggedIn ? (
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={openPostForm}
                            className={`rounded-xl border-2 border-black bg-[var(--color-accent-light)] text-xl font-semibold text-black shadow-[4px_4px_0_#000] transition hover:-translate-y-0.5 hover:bg-white ${isSidebarOpen ? 'px-7 py-3' : 'px-3 py-2'
                                }`}
                        >
                            {isSidebarOpen ? 'Post' : '+'}
                        </button>
                    </div>
                ) : null}
            </div>
        </>
    );
}