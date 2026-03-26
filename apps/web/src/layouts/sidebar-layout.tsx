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
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
    }, [location.pathname]);

    return (
        <div className="flex flex-col h-screen">
            <PageHeader
                isLoggedIn={isLoggedIn}
                isRegistering={isRegistering}
                profile={profile}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />

            <div className="flex flex-1 overflow-hidden bg-[#ececec]">
                {isRegistering ? <aside
                    className={`relative shrink-0 bg-[#8f0010] text-black transition-all duration-300 ${isSidebarOpen ? 'w-36 sm:w-40' : 'w-16'
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

                <main className="flex-1 overflow-auto">
                    <Outlet
                        context={{ user }}
                    />
                </main>
            </div>

            <Form
                showForm={showForm}
                user={user}
                onClose={() => setShowForm(false)}
            />
        </div>
    );
}