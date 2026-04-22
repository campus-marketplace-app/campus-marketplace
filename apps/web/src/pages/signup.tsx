import { useState, type ComponentProps } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUpWithEmail } from "@campus-marketplace/backend";
import { useTheme } from '../contexts/ThemeContext';

type SignupAccountType = "student" | "business";

const interFont = { fontFamily: "'Inter', sans-serif" };
const spaceGroteskFont = { fontFamily: "'Space Grotesk', sans-serif" };

export default function Signup() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [accountType, setAccountType] = useState<SignupAccountType>("student");
    const [password, setPassword] = useState('');
    const [rePassword, setRePassword] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [rePasswordMessage, setRePasswordMessage] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [displayNameMessage, setDisplayNameMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState('');

    const requireEdu = import.meta.env.VITE_REQUIRE_EDU_EMAIL === 'true';

    const checkEmail = (value: string) => {
        if (requireEdu) {
            const emailRegex = /^[A-Z0-9._%+-]+@njit\.edu$/i;
            if (!emailRegex.test(value)) {
                setEmailMessage('Please enter a valid NJIT email address ending in @njit.edu.');
                return false;
            }
        } else if (!value.includes('@') || !value.includes('.')) {
            setEmailMessage('Please enter a valid email address.');
            return false;
        }

        setEmailMessage('');
        return true;
    }

    const checkPassword = (value: string) => {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

        if (!passwordRegex.test(value)) {
            setPasswordMessage('Password must be at least 6 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.');
            return false;
        }

        setPasswordMessage('');
        return true;
    }

    const checkRePassword = (currentPassword: string, currentRePassword: string) => {
        if (currentPassword !== currentRePassword) {
            setRePasswordMessage('Passwords do not match.');
            return false;
        }

        setRePasswordMessage('');
        return true;
    }

    const checkDisplayName = (value: string) => {
        if (!value.trim()) {
            setDisplayNameMessage('Username is required.');
            return false;
        }
        setDisplayNameMessage('');
        return true;
    }

    const handleSubmit: ComponentProps<'form'>['onSubmit'] = async (e) => {
        e.preventDefault();

        setSubmitted(true);
        const isEmailValid = checkEmail(email);
        const isPasswordValid = checkPassword(password);
        const isRePasswordValid = checkRePassword(password, rePassword);
        const isDisplayNameValid = checkDisplayName(displayName);

        if (!isEmailValid || !isPasswordValid || !isRePasswordValid || !isDisplayNameValid) {
            return;
        }

        setLoading(true);
        setServerError('');
        try {
            const { session } = await signUpWithEmail({
                email,
                password,
                display_name: displayName,
                account_type: accountType,
            });

            if (session) {
                localStorage.setItem("access_token", session.access_token);
                localStorage.setItem("refresh_token", session.refresh_token);
                navigate("/login", { replace: true });
            } else {
                // usually email-confirmation flow
                setServerError("Account created. Please check your email to confirm your account.");
                navigate("/login", {
                    replace: true,
                    state: {
                        signupMessage: "Account created. Please check your email for a confirmation link before signing in.",
                    },
                });
            }
        } catch (err) {
            setServerError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }


    const { signupBgUrl, schoolName } = useTheme();

    return (
        <section
            className="relative flex h-[calc(100vh-64px)] w-full items-start overflow-hidden bg-[var(--color-background-alt)] px-5 py-5 md:items-center lg:px-6 lg:py-6"
            style={signupBgUrl ? { backgroundImage: `url(${signupBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
            {signupBgUrl && <div className="absolute inset-0 bg-black/45" />}

            <div className="relative z-10 mx-auto grid w-full max-w-5xl items-start gap-8 lg:gap-10 md:grid-cols-[1.2fr_0.95fr] md:items-center">
                <div className="max-w-xl px-0 text-center md:text-left" style={interFont}>
                    <h2
                        className="w-full text-3xl font-bold leading-[1.15] text-white sm:text-4xl lg:text-4xl xl:text-5xl"
                        style={spaceGroteskFont}
                    >
                        Join {schoolName}
                        <br />
                        <span style={{ backgroundImage: 'linear-gradient(90deg, rgb(255,255,255) 0%, rgba(255,255,255,0.8) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Marketplace
                        </span>
                    </h2>

                    <p className="mt-4 max-w-full text-base font-normal leading-relaxed text-white/90 sm:text-lg lg:text-[1.35rem]">
                        Create your account to start buying, selling, and connecting with students in your campus community.
                        Use your verified school email to get started.
                    </p>
                </div>

                <div
                    className="mx-auto flex max-h-[calc(100vh-96px)] w-full max-w-[420px] flex-col rounded-[16px] border border-white/20 px-7 py-6 shadow-[0px_25px_50px_0px_rgba(0,0,0,0.25)] lg:px-8 lg:py-7"
                    style={{
                        ...interFont,
                        background: 'linear-gradient(126deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
                    }}
                >
                    <h1
                        className="text-center text-[32px] font-bold leading-9 text-[var(--color-primary-dark)] lg:text-[34px]"
                        style={spaceGroteskFont}
                    >
                        Sign Up
                    </h1>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Create your account to access the marketplace
                    </p>

                    <div className="-mr-2 mt-6 min-h-0 flex-1 overflow-y-auto pr-4">
                        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    placeholder="Choose a username"
                                    className="w-full rounded-[10px] border border-gray-300 bg-white/50 px-4 py-2.5 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-[var(--color-primary-dark)] focus:ring-1 focus:ring-[var(--color-primary-dark)]"
                                    value={displayName}
                                    onChange={(e) => {
                                        setDisplayName(e.target.value);
                                        checkDisplayName(e.target.value);
                                    }}
                                />
                                {submitted && displayNameMessage ? (
                                    <p className="mt-1 text-xs text-red-600">{displayNameMessage}</p>
                                ) : (
                                    <p className="mt-1 text-xs text-gray-500">This name is shown on your listings and profile</p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    NJIT Email Address
                                </label>
                                <input
                                    type="email"
                                    placeholder="e.g., jdoe@njit.edu"
                                    className="w-full rounded-[10px] border border-gray-300 bg-white/50 px-4 py-2.5 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-[var(--color-primary-dark)] focus:ring-1 focus:ring-[var(--color-primary-dark)]"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        checkEmail(e.target.value);
                                    }}
                                    onBlur={() => checkEmail(email)}
                                />
                                {submitted && emailMessage ? (
                                    <p className="mt-1 text-xs text-red-600">{emailMessage}</p>
                                ) : (
                                    <p className="mt-1 text-xs text-gray-500">Use your verified @njit.edu email</p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    placeholder="Create a password"
                                    className="w-full rounded-[10px] border border-gray-300 bg-white/50 px-4 py-2.5 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-[var(--color-primary-dark)] focus:ring-1 focus:ring-[var(--color-primary-dark)]"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        checkPassword(e.target.value);
                                        checkRePassword(e.target.value, rePassword);
                                    }}
                                />
                                {submitted && passwordMessage ? (
                                    <p className="mt-1 text-xs text-red-600">{passwordMessage}</p>
                                ) : (
                                    <p className="mt-1 text-xs text-gray-500">Minimum 6 characters with uppercase, lowercase, number, and symbol</p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                                    Re-enter Password
                                </label>
                                <input
                                    type="password"
                                    placeholder="Confirm your password"
                                    className="w-full rounded-[10px] border border-gray-300 bg-white/50 px-4 py-2.5 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-[var(--color-primary-dark)] focus:ring-1 focus:ring-[var(--color-primary-dark)]"
                                    value={rePassword}
                                    onChange={(e) => {
                                        const nextRePassword = e.target.value;
                                        setRePassword(nextRePassword);
                                        checkRePassword(password, nextRePassword);
                                    }}
                                />
                                {submitted && rePasswordMessage ? (
                                    <p className="mt-1 text-xs text-red-600">{rePasswordMessage}</p>
                                ) : null}
                            </div>

                            <div>
                                <p className="mb-1.5 block text-sm font-medium text-gray-700">I am a...</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <label
                                        className={`flex cursor-pointer items-center justify-center rounded-[10px] border px-4 py-2.5 text-sm font-semibold transition ${
                                            accountType === 'student'
                                                ? 'border-[var(--color-primary-dark)] bg-[var(--color-primary-dark)] text-white'
                                                : 'border-gray-300 bg-white/60 text-gray-800 hover:bg-white'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="accountType"
                                            value="student"
                                            checked={accountType === 'student'}
                                            onChange={() => setAccountType('student')}
                                            className="sr-only"
                                        />
                                        Student
                                    </label>

                                    <label
                                        className={`flex cursor-pointer items-center justify-center rounded-[10px] border px-4 py-2.5 text-sm font-semibold transition ${
                                            accountType === 'business'
                                                ? 'border-[var(--color-primary-dark)] bg-[var(--color-primary-dark)] text-white'
                                                : 'border-gray-300 bg-white/60 text-gray-800 hover:bg-white'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="accountType"
                                            value="business"
                                            checked={accountType === 'business'}
                                            onChange={() => setAccountType('business')}
                                            className="sr-only"
                                        />
                                        Business
                                    </label>
                                </div>
                            </div>

                            {serverError && (
                                <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {serverError}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-[10px] py-2.5 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                                style={{
                                    ...interFont,
                                    background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                                }}
                            >
                                {loading ? 'Signing up...' : 'Create Account'}
                            </button>
                        </form>

                        <div className="relative my-4 flex items-center">
                            <div className="flex-1 border-t border-gray-200" />
                            <span className="px-4 text-sm text-gray-500" style={{ ...interFont, background: 'linear-gradient(126deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%)' }}>
                                Already have an account?
                            </span>
                            <div className="flex-1 border-t border-gray-200" />
                        </div>

                        <Link
                            to="/login"
                            className="block w-full rounded-[10px] border border-[var(--color-primary-dark)] py-2.5 text-center text-base font-semibold text-[var(--color-primary-dark)] transition hover:bg-[var(--color-primary-dark)]/5"
                            style={interFont}
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}