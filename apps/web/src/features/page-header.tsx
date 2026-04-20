import { Link } from 'react-router-dom';
import { useState } from 'react';
import { User } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getAvatarUrl, type Notification } from '@campus-marketplace/backend';
import NotificationBell from './notification-bell';
import { AboutModal } from './about-modal';
import { HelpModal } from './help-modal';
import { ContactModal } from './contact-modal';
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
    const { schoolName } = useTheme();
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);

    const avatarUrl = profile?.avatar_path ? getAvatarUrl(profile.avatar_path) : null;

    return (
        <nav
            className="sticky top-0 z-50 w-full bg-[var(--color-primary)] border-b border-black/20 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            <div className="flex items-center gap-4 px-5 py-2">

                {/* Left — logo + school name */}
                <Link to="/" className="flex items-center gap-3 shrink-0 text-[var(--color-text-on-primary)] hover:opacity-90 transition-opacity">
                    <div className="size-14 rounded-full flex items-center justify-center shadow-2xl overflow-hidden border-4" style={{background: '#99040B', borderColor: '#FFFFFF'}}>
                      <svg viewBox="0 0 40 40" className="w-full h-full">
                        {/* Shopping bag body - white */}
                        <path d="M 10 16 L 8 30 C 8 31 9 32 10 32 L 30 32 C 31 32 32 31 32 30 L 30 16 Z" fill="white" stroke="white" strokeWidth="0.5"/>

                        {/* Bag handle - white */}
                        <path d="M 12 14 C 12 10 14.5 8 20 8 C 25.5 8 28 10 28 14" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"/>

                        {/* Eyes - dots */}
                        <circle cx="15" cy="20" r="1.5" fill="#780006"/>
                        <circle cx="25" cy="20" r="1.5" fill="#780006"/>

                        {/* Smile */}
                        <path d="M 14 24 Q 20 27 26 24" fill="none" stroke="#780006" strokeWidth="2" strokeLinecap="round"/>

                        {/* Bottom stripe - white */}
                        <path d="M 10 28 L 8 30 C 8 31 9 32 10 32 L 30 32 C 31 32 32 31 32 30 L 30 28 Z" fill="white"/>
                      </svg>
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

                {/* Right — auth controls + notifications + buttons */}
                <div className="flex items-center gap-6 ml-auto shrink-0">
                    {/* User profile and notifications section */}
                    <div className="flex items-center gap-4">
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
                        ) : null}

                        {isRegistering && isLoggedIn && (
                            <NotificationBell
                                notifications={notifications}
                                onMarkAllRead={onMarkAllRead || (() => {})}
                                onNotificationClick={onNotificationClick || (() => {})}
                            />
                        )}
                    </div>

                    {/* About, Help, Contact buttons */}
                    <div className="flex items-center gap-6 border-l border-white/20 pl-6">
                        <button onClick={() => setShowAboutModal(true)} className="text-xs font-semibold uppercase tracking-wide text-white hover:opacity-80 transition-opacity">About</button>
                        <button onClick={() => setShowHelpModal(true)} className="text-xs font-semibold uppercase tracking-wide text-white hover:opacity-80 transition-opacity">Help</button>
                        <button onClick={() => setShowContactModal(true)} className="text-xs font-semibold uppercase tracking-wide text-white hover:opacity-80 transition-opacity">Contact</button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
            <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
            <ContactModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
        </nav>
    );
}
