import { Outlet } from 'react-router-dom';
import Navbar from '../navbar/navbar';

export default function SidebarLayout() {
    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <aside className="w-52 bg-gray-200 p-4">
                <h1>Sidebar</h1>
                <Navbar />
            </aside>

            {/* Main content */}
            <main className="flex-1 bg-gray-100 p-6 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
}