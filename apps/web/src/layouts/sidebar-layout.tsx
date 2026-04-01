import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PageHeader from '../features/page-header';
import Navbar from '../features/navbar';
import Form from '../features/form';
import { getSessionFromTokens, getProfile } from "@campus-marketplace/backend";
import type { SessionUser, UserProfile } from "../features/types";
import { useNavigate } from 'react-router-dom';

export default function SidebarLayout() {
    const [searchQuery, setSearchQuery] = useState('');
    const [listingsRefreshKey, setListingsRefreshKey] = useState(0);
    const [profileRefreshKey, setProfileRefreshKey] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        if (typeof window === "undefined") {
            return true;
        }
        return window.innerWidth >= 640;
    });
    const location = useLocation();
    const isRegistering = !['/login', '/signup', '/reset-email', '/reset-password'].includes(location.pathname);
    const [user, setUser] = useState<SessionUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const navigate = useNavigate();

    const clearStoredTokens = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
    };

    const logout = () => {
        clearStoredTokens();
        setIsLoggedIn(false);
        setUser(null);
        navigate("/login", { replace: true });
    }


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
                const userProfile = await getProfile(user.id);
                setProfile(userProfile);
                setIsLoggedIn(true);
            } catch {
                clearStoredTokens();
                setIsLoggedIn(false);
                setUser(null);
            }
        };

        void checkUserSession();
    }, [location.pathname, profileRefreshKey]);

    return (
        <div className="flex h-screen flex-col overflow-x-hidden">
            <PageHeader
                isLoggedIn={isLoggedIn}
                isRegistering={isRegistering}
                profile={profile}
                avatarCacheBust={profileRefreshKey}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />

            <div className="flex min-w-0 flex-1 overflow-hidden bg-[var(--color-background)]">
                {isRegistering ? <aside
                    className={`relative shrink-0 bg-[var(--color-primary)] text-[var(--color-text-on-primary)] transition-all duration-300 ${isSidebarOpen ? 'w-16 sm:w-40' : 'w-12 sm:w-16'
                        }`}
                >
                    <Navbar
                        isSidebarOpen={isSidebarOpen}
                        isloggedIn={isLoggedIn}
                        toggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
                        openPostForm={() => setShowForm(true)}
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
                onSubmitSuccess={() => setListingsRefreshKey((prev) => prev + 1)}
            />
        </div>
    );
}