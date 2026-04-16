import { NavLink, type Location } from 'react-router-dom';
import {
    Home,
    User,
    MessageCircle,
    ShoppingBag,
    ClipboardList,
    MessageCircleQuestionMark,
    Mail,
    ScrollText,
    LogIn,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Plus,
    Palette,
} from 'lucide-react';

type NavbarProps = {
    isSidebarOpen: boolean;
    isloggedIn: boolean;
    toggleSidebar: () => void;
    openPostForm: () => void;
    openCustomizer: () => void;
    location: Location;
    user?: unknown | null;
    logout: () => void;
};

const NAV_ITEMS = [
    { to: '/',             icon: Home,          label: 'Home',        end: true  },
    { to: '/profile',      icon: User,          label: 'Profile',     end: false },
    { to: '/messages',     icon: MessageCircle, label: 'Messages',    end: false },
    { to: '/my-listings',  icon: ShoppingBag,   label: 'My Listings', end: false },
    { to: '/wishlist',     icon: ClipboardList, label: 'My Wishlist', end: false },
    { to: '/about',        icon: ScrollText, label: 'About',       end: false },
    { to : '/help',        icon: MessageCircleQuestionMark, label: 'Help',        end: false },
    { to : '/contact',     icon: Mail, label: 'Contact',     end: false },
] as const;

export default function Navbar({
    isSidebarOpen,
    isloggedIn,
    toggleSidebar,
    openPostForm,
    openCustomizer,
    logout,
}: NavbarProps) {
    return (
        <div className="flex h-full flex-col">
            {/* Toggle strip — in-flow so it aligns with icons below */}
            <div className={`flex pt-3 px-3 pb-1 ${isSidebarOpen ? 'justify-end' : 'justify-center'}`}>
                <button
                    type="button"
                    onClick={toggleSidebar}
                    className="rounded-full bg-white p-1.5 shadow-lg text-[var(--color-primary)] hover:bg-gray-100 transition-colors"
                    aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                    {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
            </div>

            {/* Nav items */}
            <nav className="flex flex-1 flex-col gap-1 px-3 pt-2 pb-4">
                {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                            [
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all relative group',
                                !isSidebarOpen ? 'justify-center' : '',
                                isActive
                                    ? 'bg-white/20 text-[var(--color-text-on-primary)]'
                                    : 'text-[var(--color-text-on-primary)]/80 hover:bg-white/10 hover:text-[var(--color-text-on-primary)]',
                            ].join(' ')
                        }
                    >
                        <Icon size={20} className="shrink-0" />
                        {isSidebarOpen && (
                            <span className="text-sm font-medium">{label}</span>
                        )}
                        {/* Tooltip shown on hover when collapsed */}
                        {!isSidebarOpen && (
                            <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                {label}
                            </span>
                        )}
                    </NavLink>
                ))}

                {/* Appearance customizer */}
                <button
                    type="button"
                    onClick={openCustomizer}
                    className={[
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all relative group text-[var(--color-text-on-primary)]/80 hover:bg-white/10 hover:text-[var(--color-text-on-primary)]',
                        !isSidebarOpen ? 'justify-center' : '',
                    ].join(' ')}
                >
                    <Palette size={20} className="shrink-0" />
                    {isSidebarOpen && <span className="text-sm font-medium">Appearance</span>}
                    {!isSidebarOpen && (
                        <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            Appearance
                        </span>
                    )}
                </button>

                {/* Login (when not logged in) */}
                {!isloggedIn && (
                    <NavLink
                        to="/login"
                        className={({ isActive }) =>
                            [
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all relative group',
                                !isSidebarOpen ? 'justify-center' : '',
                                isActive
                                    ? 'bg-white/20 text-[var(--color-text-on-primary)]'
                                    : 'text-[var(--color-text-on-primary)]/80 hover:bg-white/10 hover:text-[var(--color-text-on-primary)]',
                            ].join(' ')
                        }
                    >
                        <LogIn size={20} className="shrink-0" />
                        {isSidebarOpen && (
                            <span className="text-sm font-medium">Login</span>
                        )}
                        {!isSidebarOpen && (
                            <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Login
                            </span>
                        )}
                    </NavLink>
                )}
            </nav>

            {/* Bottom section — Post + Logout (when logged in) */}
            {isloggedIn && (
                <div className="border-t border-white/20 p-3 flex flex-col gap-2">
                    {/* Post button */}
                    <button
                        type="button"
                        onClick={openPostForm}
                        className={[
                            'flex items-center gap-2 rounded-lg bg-white text-[var(--color-primary)] font-semibold shadow hover:bg-gray-100 transition-colors',
                            isSidebarOpen ? 'px-4 py-2.5' : 'justify-center p-2.5',
                        ].join(' ')}
                    >
                        <Plus size={18} className="shrink-0" />
                        {isSidebarOpen && <span className="text-sm">Post</span>}
                    </button>

                    {/* Logout */}
                    <NavLink
                        to="/login"
                        onClick={logout}
                        className={[
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[var(--color-text-on-primary)]/80 hover:bg-white/10 hover:text-[var(--color-text-on-primary)] transition-all relative group',
                            !isSidebarOpen ? 'justify-center' : '',
                        ].join(' ')}
                    >
                        <LogOut size={20} className="shrink-0" />
                        {isSidebarOpen && (
                            <span className="text-sm font-medium">Logout</span>
                        )}
                        {!isSidebarOpen && (
                            <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Logout
                            </span>
                        )}
                    </NavLink>
                </div>
            )}
        </div>
    );
}
