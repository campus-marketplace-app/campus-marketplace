import { useState, type ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from "@campus-marketplace/backend";
import { useTheme } from '../contexts/ThemeContext';

const interFont = { fontFamily: "'Inter', sans-serif" };
const spaceGroteskFont = { fontFamily: "'Space Grotesk', sans-serif" };

export default function ResetPassword() {
    const { loginBgUrl } = useTheme();
    const [email, setEmail] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const checkEmail = (value: string) => {
        const emailRegex = /^[A-Z0-9._%+-]+@njit\.edu$/i;

        if (!emailRegex.test(value)) {
            setEmailMessage('Please enter a valid NJIT email address ending in @njit.edu.');
            return false;
        }

        setEmailMessage('');
        return true;
    }

    const handleSubmit: ComponentProps<'form'>['onSubmit'] = async (e) => {
        e.preventDefault();

        setSubmitted(true);
        const isEmailValid = checkEmail(email);

        if (!isEmailValid) {
            return;
        }

        setLoading(true);
        setServerError('');
        setSuccessMessage('');
        try {
            const resetUrl = `${window.location.origin}/reset-password`;
            await sendPasswordResetEmail(email, resetUrl);
            setSuccessMessage('If an account exists for this email, a password reset link has been sent.');
        } catch (err) {
            setServerError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <section
            className="relative flex h-full min-h-[calc(100vh-64px)] w-full items-center justify-center bg-[var(--color-background-alt)] px-4 py-8"
            style={loginBgUrl ? { backgroundImage: `url(${loginBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
            {/* Dark overlay — improves text contrast while keeping the background photo visible */}
            {loginBgUrl && <div className="absolute inset-0 bg-black/45" />}

            {/* Centered card */}
            <div
                className="relative z-10 mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-[0px_10px_40px_0px_rgba(0,0,0,0.3)]"
                style={interFont}
            >
                {/* Card header */}
                <h1
                    className="text-center text-3xl font-bold text-black"
                    style={spaceGroteskFont}
                >
                    Reset Password
                </h1>
                <p className="mt-2 text-center text-xs text-gray-600">
                    Enter your NJIT email and we will send a password reset link.
                </p>

                <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="reset-email" className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                            UCID Email Address
                        </label>
                        <input
                            id="reset-email"
                            type="email"
                            placeholder="you@njit.edu"
                            className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-base text-black outline-none placeholder:text-gray-400 focus:border-[var(--color-primary-dark)] focus:ring-2 focus:ring-[var(--color-primary-dark)]/20"
                            style={interFont}
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                checkEmail(e.target.value);
                            }}
                            onBlur={() => checkEmail(email)}
                        />
                        {submitted && emailMessage !== '' ? <p className="mt-1 text-xs text-red-600">{emailMessage}</p> : null}
                    </div>

                    {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}
                    {successMessage ? <p className="text-sm text-green-600">{successMessage}</p> : null}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 rounded-[10px] py-3 text-base font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        style={{
                            ...interFont,
                            background: 'linear-gradient(90deg, rgb(130,15,21) 0%, rgb(154,18,25) 100%)',
                        }}
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <Link
                    to="/login"
                    className="mx-auto mt-6 text-sm font-medium text-gray-600 hover:text-[var(--color-primary-dark)] transition"
                    style={interFont}
                >
                    ← Back to Login
                </Link>
            </div>
        </section>
    );
}