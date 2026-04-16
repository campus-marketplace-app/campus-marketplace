import { Link } from 'react-router-dom';
import { User, Bookmark } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getAvatarUrl, type Notification } from '@campus-marketplace/backend';
import ThemeModeToggle from './theme-mode-toggle';
import NotificationBell from './notification-bell';
import type { UserProfile } from "./types";

type HeaderProps = {
    isLoggedIn: boolean;
    isRegistering: boolean;
    profile?: UserProfile | null;
    avatarCacheBust?: number;
    showSearch?: boolean;
    searchQuery?: string;
    setSearchQuery?: (query: string) => void;
    notifications?: Notification[];
    onMarkAllRead?: () => void;
    onNotificationClick?: (n: Notification) => void;
};

export default function PageHeader({
    isLoggedIn,
    isRegistering,
    profile,
    avatarCacheBust = 0,
    showSearch,
    searchQuery,
    setSearchQuery,
    notifications = [],
    onMarkAllRead,
    onNotificationClick,
}: HeaderProps) {
    const { schoolName, logoUrl } = useTheme();

    const avatarUrl = profile?.avatar_path ? getAvatarUrl(profile.avatar_path) : null;

    return (
        <nav
            className="sticky top-0 z-50 w-full bg-[var(--color-primary)] border-b border-black/20 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            <div className="flex items-center gap-4 px-5 py-2">

                {/* Left — logo + school name */}
                <Link to="/" className="flex items-center gap-3 shrink-0 text-[var(--color-text-on-primary)] hover:opacity-90 transition-opacity">
                    <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center bg-white shadow-md"
                        style={{ borderRadius: '8px' }}
                    >
                        {/* borderRadius hardcoded — logo box must always be a rounded square
                            regardless of the user's chosen theme radius setting */}
                        {logoUrl
                            ? <img src={logoUrl} alt={schoolName} className="h-6 w-auto" />
                            : <span className="text-base font-bold text-[var(--color-primary-dark)]">
                                {schoolName.charAt(0)}
                              </span>
                        }
                    </div>
                    <span className="hidden sm:block text-base font-bold tracking-tight whitespace-nowrap">
                        {schoolName} Marketplace
                    </span>
                </Link>

                {/* Center — search bar (homepage only) */}
                {showSearch && (
                    <div className="flex-1 max-w-lg mx-2">
                        <input
                            id="search"
                            name="search"
                            type="text"
                            placeholder="Search..."
                            className="w-full rounded-lg bg-white/95 px-4 py-1.5 text-sm text-black placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-white/50 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery?.(e.target.value)}
                        />
                    </div>
                )}

                {/* Right — auth controls + cart + theme toggle */}
                <div className="flex items-center gap-3 ml-auto shrink-0">
                    {isRegistering ? (
                        isLoggedIn ? (
                            <Link
                                to="/profile"
                                className="flex items-center gap-1.5 text-[var(--color-text-on-primary)] hover:opacity-80 transition-opacity"
                            >
                                {avatarUrl ? (
                                    <img
                                        key={avatarCacheBust}
                                        src={`${avatarUrl}?v=${avatarCacheBust}`}
                                        alt="avatar"
                                        className="h-7 w-7 object-cover"
                                        style={{ borderRadius: '9999px' }}
                                    />
                                ) : (
                                    <User size={15} className="shrink-0" />
                                )}
                                <span className="hidden sm:block max-w-24 truncate text-sm">
                                    {profile?.display_name || 'Profile'}
                                </span>
                            </Link>
                        ) : (
                            <Link to="/login" className="text-sm text-[var(--color-text-on-primary)] hover:opacity-80">
                                Login
                            </Link>
                        )
                    ) : (
                        /* Login/signup pages — show marketing links */
                        <div className="flex items-center gap-6">
                            <Link to="/about" className="text-xs font-semibold uppercase tracking-wide text-white hover:opacity-80">About</Link>
                            <Link to="/help" className="text-xs font-semibold uppercase tracking-wide text-white hover:opacity-80">Help</Link>
                            <Link to="/contact" className="text-xs font-semibold uppercase tracking-wide text-white hover:opacity-80">Contact</Link>
                        </div>
                    )}

                    {isRegistering && isLoggedIn && (
                        <NotificationBell
                            notifications={notifications}
                            onMarkAllRead={onMarkAllRead || (() => {})}
                            onNotificationClick={onNotificationClick || (() => {})}
                        />
                    )}

                    {isRegistering && <ThemeModeToggle />}
                </div>
            </div>
        </nav>
    );
}
