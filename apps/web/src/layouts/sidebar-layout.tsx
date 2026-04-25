import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PageHeader from '../features/page-header';
import Navbar from '../features/navbar';
import Form from '../features/form';
import ThemeCustomizer from '../features/theme-customizer';
import { getSessionFromTokens, subscribeToNotifications, markAllNotificationsRead, markNotificationRead, type Notification } from "@campus-marketplace/backend";
import { useProfile } from "../hooks/useProfile";
import type { SessionUser } from "../features/types";
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications, useInvalidateNotifications, notificationKeys } from '../hooks/useNotifications';
import { useQueryClient } from '@tanstack/react-query';

export default function SidebarLayout() {
    const [searchQuery, setSearchQuery] = useState('');
    const [listingsRefreshKey, setListingsRefreshKey] = useState(0);
    const [profileRefreshKey, setProfileRefreshKey] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showCustomizer, setShowCustomizer] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        if (typeof window === "undefined") {
            return true;
        }
        return window.innerWidth >= 640;
    });
    const location = useLocation();
    const isRegistering = !['/login', '/signup', '/reset-email', '/reset-password'].includes(location.pathname);
    const isHomePage = location.pathname === '/' || location.pathname === '/home';
    const isMyListingsPage = location.pathname === '/my-listings';
    const [user, setUser] = useState<SessionUser | null>(null);
    const [listingToast, setListingToast] = useState<string | null>(null);

    // Profile is fetched via the cache — shared with profile.tsx and my-listings.tsx.
    const { data: profile } = useProfile(user?.id);
    const navigate = useNavigate();
    const { resetToDefaults, loadPrefsForUser } = useTheme();
    const queryClient = useQueryClient();
    const { data: notifications = [] } = useNotifications(user?.id);
    const { invalidate: invalidateNotifications } = useInvalidateNotifications();

    const clearStoredTokens = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
    };

    const logout = () => {
        clearStoredTokens();
        setIsLoggedIn(false);
        setUser(null);
        resetToDefaults();
        navigate("/login", { replace: true });
    };

    const handleMarkAllRead = async () => {
        if (!user) return;
        try {
            await markAllNotificationsRead(user.id);
            invalidateNotifications(user.id);
        } catch (error) {
            console.error("Failed to mark all notifications read:", error);
        }
    };

    const handleNotificationClick = async (n: Notification) => {
        if (!user) return;
        try {
            if (!n.is_read) {
                await markNotificationRead(n.id, user.id);
                invalidateNotifications(user.id);
            }
            const payload = n.payload as Record<string, unknown>;
            if (n.type === 'wishlist_item_sold' && payload.listing_id) {
                navigate(`/listing/${String(payload.listing_id)}`);
            } else if (n.type === 'new_message' && payload.conversation_id) {
                navigate(`/messages/${String(payload.conversation_id)}`);
            } else {
                navigate('/messages');
            }
        } catch (error) {
            console.error("Failed to handle notification click:", error);
            navigate('/messages');
        }
    };


    useEffect(() => {
        const checkUserSession = async () => {
            const accessToken = localStorage.getItem("access_token");
            const refreshToken = localStorage.getItem("refresh_token");

            if (!accessToken || !refreshToken) {
                setIsLoggedIn(false);
                setUser(null);
                return;
            }

            try {
                const { user, session } = await getSessionFromTokens(accessToken, refreshToken);

                if (!session) {
                    clearStoredTokens();
                    setIsLoggedIn(false);
                    setUser(null);
                    return;
                }

                setUser(user);
                loadPrefsForUser(user.id);
                setIsLoggedIn(true);
            } catch (error) {
                console.error("Failed to restore session from stored tokens:", error);
                clearStoredTokens();
                setIsLoggedIn(false);
                setUser(null);
            }
        };

        void checkUserSession();
    }, [profileRefreshKey, loadPrefsForUser, location.pathname]);

    // Subscribe to realtime notifications when user logs in.
    useEffect(() => {
        if (!user) return;

        const { unsubscribe } = subscribeToNotifications(user.id, (newNotif) => {
            queryClient.setQueryData(
                notificationKeys.byUser(user.id),
                (prev: Notification[] | undefined) => [newNotif, ...(prev ?? [])],
            );
        });

        return unsubscribe;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    useEffect(() => {
        if (!listingToast) return;
        const timer = window.setTimeout(() => setListingToast(null), 7000);
        return () => window.clearTimeout(timer);
    }, [listingToast]);

    return (
        <div className="flex h-screen flex-col overflow-x-hidden">
            {listingToast && (
                <div
                    className="fixed right-5 top-24 z-50 w-[min(92vw,28rem)] rounded-2xl border p-4 shadow-xl"
                    style={{
                        backgroundColor: "var(--color-surface)",
                        borderColor: "var(--color-primary)",
                    }}
                >
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-[var(--color-primary)] px-2 py-1 text-xs font-bold text-[var(--color-text-on-primary)]">
                            LISTING
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{listingToast}</p>
                            {!isMyListingsPage && (
                                <button
                                    type="button"
                                    className="mt-2 text-sm font-semibold underline underline-offset-2"
                                    style={{ color: "var(--color-primary)" }}
                                    onClick={() => {
                                        setListingToast(null);
                                        navigate('/my-listings');
                                    }}
                                >
                                    View My Listings
                                </button>
                            )}
                        </div>
                        <button
                            type="button"
                            className="text-sm font-bold transition"
                            style={{ color: "var(--color-text-muted)" }}
                            onClick={() => setListingToast(null)}
                            aria-label="Dismiss notification"
                        >
                            x
                        </button>
                    </div>
                </div>
            )}

            <PageHeader
                isLoggedIn={isLoggedIn}
                isRegistering={isRegistering}
                profile={profile}
                avatarCacheBust={profileRefreshKey}
                showSearch={isHomePage}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                notifications={notifications}
                onMarkAllRead={handleMarkAllRead}
                onNotificationClick={handleNotificationClick}
            />

            <div className="flex min-w-0 flex-1 overflow-hidden bg-[var(--color-background)]">
                {isRegistering ? <aside
                    className={`relative shrink-0 bg-[var(--color-primary)] text-[var(--color-text-on-primary)] transition-all duration-300 shadow-lg border-r-2 border-white/10 ${isSidebarOpen ? 'w-48 sm:w-64' : 'w-14 sm:w-[72px]'}`}
                >
                    <Navbar
                        isSidebarOpen={isSidebarOpen}
                        isloggedIn={isLoggedIn}
                        toggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
                        openPostForm={() => setShowForm(true)}
                        openCustomizer={() => setShowCustomizer(true)}
                        location={location}
                        user={user}
                        logout={logout}
                    />
                </aside> : null}

                <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
                    <Outlet
                        context={{
                            user,
                            searchQuery,
                            listingsRefreshKey,
                            onProfileSave: () => setProfileRefreshKey((prev) => prev + 1),
                            openPostForm: () => setShowForm(true),
                        }}
                    />
                </main>
            </div>

            <Form
                showForm={showForm}
                user={user}
                onClose={() => setShowForm(false)}
                onSubmitSuccess={({ intent }) => {
                    setListingsRefreshKey((prev) => prev + 1);
                    setListingToast(intent === 'publish' ? 'Listing published successfully.' : 'Draft saved successfully.');
                }}
            />

            <ThemeCustomizer
                open={showCustomizer}
                onClose={() => setShowCustomizer(false)}
                isLoggedIn={!!user}
            />
        </div>
    );
}