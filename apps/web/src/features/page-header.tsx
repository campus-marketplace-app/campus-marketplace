import { Link } from 'react-router-dom';
import { getAvatarUrl } from '@campus-marketplace/backend';
import { useTheme } from '../contexts/ThemeContext';
import ThemeModeToggle from './theme-mode-toggle';
import type { UserProfile } from "./types";

type HeaderProps = {
    isLoggedIn: boolean;
    isRegistering: boolean;
    profile?: UserProfile | null;
    avatarCacheBust?: number;
    searchQuery?: string;
    setSearchQuery?: (query: string) => void;
};

export default function PageHeader({
    isLoggedIn,
    isRegistering,
    profile,
    avatarCacheBust,
    searchQuery,
    setSearchQuery,
}: HeaderProps) {
    const profileAvatarSrc = profile?.avatar_path
        ? `${getAvatarUrl(profile.avatar_path)}?t=${avatarCacheBust ?? 0}`
        : '/default-avatar.png';
    const { schoolName, logoUrl } = useTheme();

    return (
        <nav
            className="w-full bg-[var(--color-primary)] border-b border-white/10 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)]"
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-4">
                <Link to="/" className="flex items-center gap-4 text-[var(--color-text-on-primary)]">
                    {/* White rounded logo box with school initial or logo image */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-white shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1),0px_2px_4px_0px_rgba(0,0,0,0.1)]">
                        {logoUrl
                            ? <img src={logoUrl} alt={schoolName} className="h-8 w-auto" />
                            : <span className="text-2xl font-bold text-[var(--color-primary-dark)]" style={{ fontFamily: "'Inter', sans-serif" }}>
                                {schoolName.charAt(0)}
                              </span>
                        }
                    </div>
                    <div>
                        <p className="text-2xl font-bold leading-8 tracking-[-0.6px]" style={{ fontFamily: "'Inter', sans-serif" }}>
                            {schoolName} Marketplace
                        </p>
                        {!isRegistering && (
                            <p className="text-sm font-medium text-white/80" style={{ fontFamily: "'Inter', sans-serif" }}>
                                Campus Trading Platform
                            </p>
                        )}
                    </div>
                </Link>

                {isRegistering ? (
                    <input
                        id='search'
                        name='search'
                        type="text"
                        placeholder="Search..."
                        className="w-full min-w-[10rem] flex-1 rounded bg-white px-4 py-2 text-black placeholder:text-gray-500 sm:max-w-md"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery?.(e.target.value)}
                    />
                ) : null}

                {isRegistering ? (
                    isLoggedIn ? (
                        <Link to="/profile" className="flex items-center gap-2 text-[var(--color-text-on-primary)] hover:opacity-80">
                            <img src={profileAvatarSrc} alt="Profile" className="h-8 w-8 rounded-full object-cover" />
                            <p className="max-w-24 truncate text-[var(--color-text-on-primary)] sm:max-w-32">{profile?.display_name || 'Profile'}</p>
                        </Link> //placeholder for profile img
                    ) : (
                        <Link to="/login" className="text-[var(--color-text-on-primary)] hover:opacity-80">
                            Login
                        </Link>
                    )
                ) : (
                    /* Login/signup pages: show nav links instead of auth controls */
                    <div className="flex items-center gap-8">
                        <a href="#" className="text-sm font-semibold uppercase tracking-[0.35px] text-white hover:opacity-80" style={{ fontFamily: "'Inter', sans-serif" }}>
                            About
                        </a>
                        <a href="#" className="text-sm font-semibold uppercase tracking-[0.35px] text-white hover:opacity-80" style={{ fontFamily: "'Inter', sans-serif" }}>
                            Help
                        </a>
                        <a href="#" className="text-sm font-semibold uppercase tracking-[0.35px] text-white hover:opacity-80" style={{ fontFamily: "'Inter', sans-serif" }}>
                            Contact
                        </a>
                    </div>
                )}

                {isRegistering && isLoggedIn ? (
                    <Link
                        to="/wishlist"
                        aria-label="Wishlist"
                        className="text-[var(--color-text-on-primary)] p-1 cursor-pointer hover:opacity-80"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-6 w-6"
                        >
                            <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="9" y1="13" x2="15" y2="13" />
                            <line x1="9" y1="17" x2="15" y2="17" />
                        </svg>
                    </Link>
                ) : null}

                {isRegistering && <ThemeModeToggle />}
            </div>
        </nav>
    );
}
