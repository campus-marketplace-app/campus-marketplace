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
    const shouldCenterTitle = !isLoggedIn && !isRegistering;
    const profileAvatarSrc = profile?.avatar_path
        ? `${getAvatarUrl(profile.avatar_path)}?t=${avatarCacheBust ?? 0}`
        : '/default-avatar.png';
    const { schoolName, logoUrl } = useTheme();

    return (
        <nav className="w-full bg-[var(--color-primary)] p-3 sm:p-4">
            <div className={`flex min-w-0 flex-wrap items-center gap-3 sm:gap-6 ${shouldCenterTitle ? 'justify-center' : 'justify-between'}`}>
                <Link to="/" className="flex min-w-0 items-center gap-2 text-lg font-bold text-[var(--color-text-on-primary)] sm:text-xl">
                    {logoUrl && <img src={logoUrl} alt={schoolName} className="h-8 w-auto" />}
                    <span className="truncate">{schoolName} Marketplace</span>
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
                ) : null}

                {isRegistering && isLoggedIn ? (
                    <button
                        type="button"
                        aria-label="Cart"
                        onClick={() => {}}
                        className="text-[var(--color-text-on-primary)] p-1 cursor-pointer hover:opacity-80"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-6 w-6"
                        >
                            <circle cx="9" cy="20" r="1" />
                            <circle cx="17" cy="20" r="1" />
                            <path d="M3 4h2l2.6 10.4A2 2 0 0 0 9.5 16H17a2 2 0 0 0 1.9-1.4L21 7H7" />
                        </svg>
                    </button>
                ) : null}

                {isRegistering && <ThemeModeToggle />}
            </div>
        </nav>
    );
}
