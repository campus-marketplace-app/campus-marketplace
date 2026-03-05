export default function Navbar() {
    return (
        <div className="flex items-center justify-between gap-8">
            {/* Logo */}
            <div className="text-white font-bold text-xl">
                Campus Marketplace
            </div>

            {/* Center Search Bar */}
            <input
                type="text"
                placeholder="Search..."
                className="flex-1 max-w-md rounded bg-white px-4 py-2 text-black placeholder:text-gray-700"
            />

            <div className="text-white text-lg">cart</div>
        </div>
    );
}