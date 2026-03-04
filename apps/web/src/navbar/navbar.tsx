import { Link } from "react-router-dom";

export default function Navbar() {
    return (
        <nav className="sidebar">
            <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/profile">Profile</Link></li>
            </ul>
        </nav>
    );
}