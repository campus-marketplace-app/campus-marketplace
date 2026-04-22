import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, type ComponentProps } from 'react';
import { signInWithEmail } from "@campus-marketplace/backend";
import { useTheme } from '../contexts/ThemeContext';

const interFont = { fontFamily: "'Inter', sans-serif" };
const spaceGroteskFont = { fontFamily: "'Space Grotesk', sans-serif" };


export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { loginBgUrl, schoolName } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [deactivatedMessage, setDeactivatedMessage] = useState('');
    const signupMessage = (location.state as { signupMessage?: string } | null)?.signupMessage ?? '';

    useEffect(() => {
        if (!signupMessage) return;
        navigate(location.pathname, { replace: true, state: null });
    }, [signupMessage, location.pathname, navigate]);

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
                const message = error instanceof Error ? error.message : String(error);
                if (message.startsWith('account_deactivated:')) {
                    setDeactivatedMessage(
                        'Your account has been deactivated. ' +
                        'Contact support to restore access.',
                    );
                } else {
                    //Needs to be hidden from users, but for now we will log it to the console for debugging purposes.
                    console.error('Error signing in:', error);
                }
            }
        }
        if (!isEmailValid || !isPasswordValid) {
            alert('Please fix the errors before submitting.');
        }
    }

    return (
        <section
                className="relative flex min-h-[calc(100vh-64px)] w-full items-start overflow-x-hidden bg-[var(--color-background-alt)] px-4 py-5 sm:px-5 md:items-center md:py-6 lg:px-6"
                style={loginBgUrl ? { backgroundImage: `url(${loginBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
            {/* Dark overlay — improves text contrast while keeping the background photo visible */}
            {loginBgUrl && <div className="absolute inset-0 bg-black/45" />}

            <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-6 md:gap-8 lg:gap-10 md:grid-cols-[1.2fr_0.95fr] md:items-center">

                {/* Left side: welcome text + social media */}
                <div className="ml-0 max-w-2xl px-0 text-center md:-ml-12 md:text-left" style={interFont}>
                    {/* "Welcome to NJIT / Marketplace" heading — Space Grotesk Bold */}
                    <h2
                        className="w-full text-3xl font-bold leading-[1.15] text-white sm:text-4xl lg:text-4xl xl:text-5xl md:whitespace-nowrap"
                        style={spaceGroteskFont}
                    >
                        Welcome to {schoolName} <span style={{ backgroundImage: 'linear-gradient(90deg, rgb(255,255,255) 0%, rgba(255,255,255,0.8) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Marketplace!</span>
                    </h2>

                    {/* Description */}
                    <p className="mt-4 max-w-full text-base font-normal leading-relaxed text-white/90 sm:text-lg lg:text-[1.35rem]">
                        Campus Marketplace is a student-only platform where {schoolName} students can safely buy,
                        sell, and promote services using verified .edu accounts. Making campus transactions simple,
                        secure, and local.
                    </p>
                </div>

                {/* Right side: login card — glass morphism */}
                <div
                    className="mx-auto w-full max-w-[420px] rounded-[16px] border border-white/20 px-5 py-5 shadow-[0px_25px_50px_0px_rgba(0,0,0,0.25)] sm:px-7 sm:py-6 lg:px-8 lg:py-7"
                    style={{
                        ...interFont,
                        background: 'linear-gradient(126deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
                    }}
                >
                    {/* Card header */}
                    <h1
                        className="text-center text-[32px] font-bold leading-9 text-[var(--color-primary-dark)] lg:text-[34px]"
                        style={spaceGroteskFont}
                    >
                        Login
                    </h1>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Sign in to access the marketplace
                    </p>

                    {deactivatedMessage && (
                        <div className="mt-4 rounded-[var(--radius-sm)] border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {deactivatedMessage}
                        </div>
                    )}

                    {signupMessage && (
                        <div className="mt-4 rounded-[var(--radius-sm)] border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {signupMessage}
                        </div>
                    )}

                    <form className="mt-6 flex flex-col gap-4.5" onSubmit={handleSubmit}>
                        {/* Email field */}
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                NJIT Email Address
                            </label>
                            <input
                                type="email"
                                placeholder="e.g., jdoe@njit.edu"
                                className="w-full rounded-[10px] border border-gray-300 bg-white/50 px-4 py-2.5 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-[var(--color-primary-dark)] focus:ring-1 focus:ring-[var(--color-primary-dark)]"
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
                                className="w-full rounded-[10px] border border-gray-300 bg-white/50 px-4 py-2.5 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-[var(--color-primary-dark)] focus:ring-1 focus:ring-[var(--color-primary-dark)]"
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
                            className="w-full rounded-[10px] py-2.5 text-base font-semibold text-white transition hover:opacity-90"
                            style={{
                                ...interFont,
                                background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                            }}
                        >
                            Sign In
                        </button>
                    </form>

                    {/* "Don't have an account?" — horizontal divider with text overlay */}
                    <div className="relative my-4 flex items-center">
                        <div className="flex-1 border-t border-gray-200" />
                        <span className="px-4 text-sm text-gray-500" style={{ ...interFont, background: 'linear-gradient(126deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)' }}>
                            Don't have an account?
                        </span>
                        <div className="flex-1 border-t border-gray-200" />
                    </div>

                    {/* Create New Account button */}
                    <Link
                        to="/signup"
                        className="block w-full rounded-[10px] border border-[var(--color-primary-dark)] py-2.5 text-center text-base font-semibold text-[var(--color-primary-dark)] transition hover:bg-[var(--color-primary-dark)]/5"
                        style={interFont}
                    >
                        Create New Account
                    </Link>
                </div>
            </div>
        </section>

    );
}