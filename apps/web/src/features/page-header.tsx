import { Link } from 'react-router-dom';

type HeaderProps = {
    isLoggedIn: boolean;
    isRegistering: boolean;
    user?: unknown | null;
};

export default function PageHeader({
    isLoggedIn,
    isRegistering,
    user,
}: HeaderProps) {
    return (
        <nav className="bg-red-700 p-4 w-full">
            <div className="flex items-center justify-between gap-8">
                <Link to="/" className="text-white font-bold text-xl">
                    Campus Marketplace
                </Link>

                {isRegistering ? (
                    <input
                        id='search'
                        name='search'
                        type="text"
                        placeholder="Search..."
                        className="flex-1 max-w-md rounded bg-white px-4 py-2 text-black placeholder:text-gray-700"
                    />
                ) : null}

                {isRegistering ? (
                    isLoggedIn ? (
                        <Link to="/profile" className="text-white hover:text-gray-200">
                            Profile 
                        </Link> //placeholder for profile img
                    ) : (
                        <Link to="/login" className="text-white hover:text-gray-200">
                            Login
                        </Link>
                    )
                ) : null}

                {isRegistering && isLoggedIn ? (
                    <button
                        type="button"
                        aria-label="Cart"
                        onClick={() => {}}
                        className="text-white p-1 cursor-pointer hover:text-gray-200"
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
            </div>
        </nav>
    );
}
