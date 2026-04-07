import { Link, useNavigate } from 'react-router-dom';
import { useState, type ComponentProps } from 'react';
import { signInWithEmail } from "@campus-marketplace/backend";
import { useTheme } from '../contexts/ThemeContext';

const interFont = { fontFamily: "'Inter', sans-serif" };
const spaceGroteskFont = { fontFamily: "'Space Grotesk', sans-serif" };

// Simple inline SVG icons for social media
function FacebookIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
    );
}

function InstagramIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
    );
}

function TwitterIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

export default function Login() {
    const navigate = useNavigate();
    const { loginBgUrl, schoolName } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const checkEmail = (value: string) => {
        const emailRegex = /^[A-Z0-9._%+-]+@njit\.edu$/i;

        if (!emailRegex.test(value)) {
            setEmailMessage('Please enter a valid NJIT email address ending in @njit.edu.');
            return false;
        }

        setEmailMessage('');
        return true;
    }

    const checkPassword = (value: string) => {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

        if (!passwordRegex.test(value)) {
            setPasswordMessage('password incorrect');
            return false;
        }

        setPasswordMessage('');
        return true;
    }

    const handleSubmit: ComponentProps<'form'>['onSubmit'] = async (e) => {
        e.preventDefault();

        setSubmitted(true);
        const isEmailValid = checkEmail(email);
        const isPasswordValid = checkPassword(password);

        if (isEmailValid && isPasswordValid && email !== '' && password !== '') {
            try {
                const { session } = await signInWithEmail({ email, password });
                if (!session) {
                    alert("Please confirm your email first.");
                    return;
                }

                localStorage.setItem("access_token", session.access_token);
                localStorage.setItem("refresh_token", session.refresh_token);
                navigate("/", { replace: true });
            } catch (error) {
                //Needs to be hidden from users, but for now we will log it to the console for debugging purposes.
                console.error("Error signing in:", error);
            }
        }
        if (!isEmailValid || !isPasswordValid) {
            alert('Please fix the errors before submitting.');
        }
    }

    return (
        <section
            className="relative flex h-full min-h-[calc(100vh-64px)] w-full items-center bg-[var(--color-background-alt)] px-6 py-8"
            style={loginBgUrl ? { backgroundImage: `url(${loginBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
            {/* Dark overlay — improves text contrast while keeping the background photo visible */}
            {loginBgUrl && <div className="absolute inset-0 bg-black/45" />}

            <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 md:grid-cols-[1.4fr_1fr] md:items-center">

                {/* Left side: welcome text + social media */}
                <div className="px-2 sm:px-4" style={interFont}>
                    {/* "Welcome to NJIT / Marketplace" heading — Space Grotesk Bold */}
                    <h2
                        className="text-5xl font-bold leading-[1.25] text-white sm:text-[48px]"
                        style={spaceGroteskFont}
                    >
                        Welcome to {schoolName}
                        <br />
                        <span style={{ backgroundImage: 'linear-gradient(90deg, rgb(255,255,255) 0%, rgba(255,255,255,0.8) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Marketplace
                        </span>
                    </h2>

                    {/* Description */}
                    <p className="mt-6 text-lg font-normal leading-relaxed text-white/90">
                        Campus Marketplace is a student-only platform where {schoolName} students can safely buy,
                        sell, and promote services using verified .edu accounts. Making campus transactions simple,
                        secure, and local.
                    </p>

                    {/* Social media */}
                    <p className="mt-8 text-sm font-normal text-white/70">
                        Follow us on social media:
                    </p>
                    <div className="mt-3 flex gap-4">
                        <a
                            href="#"
                            aria-label="Facebook"
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                        >
                            <FacebookIcon />
                        </a>
                        <a
                            href="#"
                            aria-label="Instagram"
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                        >
                            <InstagramIcon />
                        </a>
                        <a
                            href="#"
                            aria-label="Twitter"
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                        >
                            <TwitterIcon />
                        </a>
                    </div>
                </div>

                {/* Right side: login card — glass morphism */}
                <div
                    className="mx-auto w-full max-w-[448px] rounded-[16px] border border-white/20 px-8 py-8 shadow-[0px_25px_50px_0px_rgba(0,0,0,0.25)]"
                    style={{
                        ...interFont,
                        background: 'linear-gradient(126deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
                    }}
                >
                    {/* Card header */}
                    <h1
                        className="text-center text-[36px] font-bold leading-10 text-[var(--color-primary-dark)]"
                        style={spaceGroteskFont}
                    >
                        Login
                    </h1>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Sign in to access the marketplace
                    </p>

                    <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
                        {/* Email field */}
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                NJIT Email Address
                            </label>
                            <input
                                type="email"
                                placeholder="e.g., jdoe@njit.edu"
                                className="w-full rounded-[10px] border border-gray-300 bg-white/50 px-4 py-3 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-[var(--color-primary-dark)] focus:ring-1 focus:ring-[var(--color-primary-dark)]"
                                style={interFont}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            {submitted && emailMessage ? (
                                <p className="mt-1 text-xs text-red-600">{emailMessage}</p>
                            ) : (
                                <p className="mt-1 text-xs text-gray-500">Use your verified @njit.edu email</p>
                            )}
                        </div>

                        {/* Password field */}
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <input
                                type="password"
                                placeholder="Enter your password"
                                className="w-full rounded-[10px] border border-gray-300 bg-white/50 px-4 py-3 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-[var(--color-primary-dark)] focus:ring-1 focus:ring-[var(--color-primary-dark)]"
                                style={interFont}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            {submitted && passwordMessage ? (
                                <p className="mt-1 text-xs text-red-600">{passwordMessage}</p>
                            ) : (
                                <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
                            )}
                            {/* Forgot password — tight below helper text */}
                            <div className="mt-2 flex justify-end">
                                <Link
                                    to="/reset-email"
                                    className="text-sm font-medium text-[var(--color-primary-dark)] hover:underline"
                                    style={interFont}
                                >
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        {/* Sign In button — gradient matching Figma */}
                        <button
                            type="submit"
                            className="w-full rounded-[10px] py-3 text-base font-semibold text-white transition hover:opacity-90"
                            style={{
                                ...interFont,
                                background: 'linear-gradient(90deg, rgb(130,15,21) 0%, rgb(154,18,25) 100%)',
                            }}
                        >
                            Sign In
                        </button>
                    </form>

                    {/* "Don't have an account?" — horizontal divider with text overlay */}
                    <div className="relative my-5 flex items-center">
                        <div className="flex-1 border-t border-gray-200" />
                        <span className="px-4 text-sm text-gray-500" style={{ ...interFont, background: 'linear-gradient(126deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)' }}>
                            Don't have an account?
                        </span>
                        <div className="flex-1 border-t border-gray-200" />
                    </div>

                    {/* Create New Account button */}
                    <Link
                        to="/signup"
                        className="block w-full rounded-[10px] border border-[var(--color-primary-dark)] py-3 text-center text-base font-semibold text-[var(--color-primary-dark)] transition hover:bg-[var(--color-primary-dark)]/5"
                        style={interFont}
                    >
                        Create New Account
                    </Link>
                </div>
            </div>
        </section>
    );
}
