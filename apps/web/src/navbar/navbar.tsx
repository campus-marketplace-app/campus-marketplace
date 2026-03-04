import { Link } from "react-router-dom";
import { useState } from "react";

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <nav className="sidebar">
            <div>
                <button className="md:hidden text-2xl" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? "" : "☰"}
                </button>
            </div>
            <div className={`flex-col md:flex md:flex-row gap-4 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <ul className="list-none center">
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/profile">Profile</Link></li>
                </ul>
            </div>
        </nav>
    );
}