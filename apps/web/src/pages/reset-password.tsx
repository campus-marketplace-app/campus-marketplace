import { useEffect, useState, type ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import { completePasswordReset, updatePassword } from "@campus-marketplace/backend";

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [rePassword, setRePassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [rePasswordMessage, setRePasswordMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [code, setCode] = useState('');
    const [mode, setMode] = useState<'pkce' | 'implicit' | null>(null);
    const [implicitTokens, setImplicitTokens] = useState<{ access: string; refresh: string } | null>(null);

    const checkPassword = (value: string) => {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

        if (!passwordRegex.test(value)) {
            setPasswordMessage('Password must be at least 6 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.');
            return false;
        }

        setPasswordMessage('');
        return true;
    };

    const checkRePassword = (currentPassword: string, currentRePassword: string) => {
        if (currentPassword !== currentRePassword) {
            setRePasswordMessage('Passwords do not match.');
            return false;
        }

        setRePasswordMessage('');
        return true;
    };

    const handleSubmit: ComponentProps<'form'>['onSubmit'] = async (e) => {
        e.preventDefault();

        setSubmitted(true);
        const isPasswordValid = checkPassword(password);
        const isRePasswordValid = checkRePassword(password, rePassword);

        if (!isPasswordValid || !isRePasswordValid) {
            return;
        }

        setLoading(true);
        setServerError('');
        setSuccessMessage('');
        try {
            if (mode === 'pkce') {
                await completePasswordReset(code, password);
            } else if (mode === 'implicit' && implicitTokens) {
                await updatePassword(implicitTokens.access, implicitTokens.refresh, password);
            } else {
                throw new Error('Reset link is invalid or expired. Please request a new password reset email.');
            }
            setSuccessMessage('Your password has been reset successfully. You can now sign in with your new password.');
        } catch (err) {
            setServerError(err instanceof Error ? err.message : 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);

        // Supabase error redirect — e.g. expired or already-used link.
        // Show the exact reason from the URL rather than a generic message.
        const errorCode = searchParams.get("error_code");
        const errorDescription = searchParams.get("error_description");
        if (errorCode) {
            const message = errorCode === 'otp_expired'
                ? 'This reset link has expired. Please request a new password reset email.'
                : (errorDescription ?? 'Reset link is invalid or expired. Please request a new password reset email.');
            setServerError(message);
            return;
        }

        // PKCE format: /reset-password?code=xxx
        const queryCode = searchParams.get("code") ?? "";
        if (queryCode) {
            setCode(queryCode);
            setMode('pkce');
            return;
        }

        // Implicit format: /reset-password#access_token=xxx&refresh_token=yyy&type=recovery
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        const type = hash.get("type");
        if (accessToken && type === "recovery") {
            setImplicitTokens({ access: accessToken, refresh: refreshToken ?? "" });
            setMode('implicit');
            return;
        }

        setServerError('Reset link is invalid or expired. Please request a new password reset email.');
    }, []);

    return (
        <section className="flex min-h-[calc(100vh-64px)] w-full items-center justify-center bg-[var(--color-background-alt)] px-4 py-10 sm:px-8">
            <div className="w-full max-w-md border border-[var(--color-primary-dark)] bg-[var(--color-secondary-muted)] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.22)] sm:p-8">
                <h1 className="bg-[var(--color-primary-dark)] py-2 text-center text-3xl font-semibold uppercase tracking-wide text-black">
                    Reset Password
                </h1>

                <p className="mt-4 text-center text-base text-black sm:text-lg">
                    Set your new password below and confirm it.
                </p>

                <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
                    <input
                        id="reset-password"
                        type="password"
                        placeholder="Password"
                        className="w-full rounded-md border-b border-black bg-white px-4 py-3 text-base text-black outline-none placeholder:text-black/70"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            checkPassword(e.target.value);
                            checkRePassword(e.target.value, rePassword);
                        }}
                    />
                    {submitted && passwordMessage !== '' ? <p className="text-sm text-white">{passwordMessage}</p> : null}

                    <input
                        id="reset-password-confirmation"
                        type="password"
                        placeholder="Re-enter Password"
                        className="w-full rounded-md border-b border-black bg-white px-4 py-3 text-base text-black outline-none placeholder:text-black/70"
                        value={rePassword}
                        onChange={(e) => {
                            const nextRePassword = e.target.value;
                            setRePassword(nextRePassword);
                            checkRePassword(password, nextRePassword);
                        }}
                    />
                    {submitted && rePasswordMessage !== '' ? <p className="text-sm text-white">{rePasswordMessage}</p> : null}

                    {serverError ? <p className="text-sm text-white">{serverError}</p> : null}
                    {successMessage ? <p className="text-sm text-white">{successMessage}</p> : null}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 bg-[var(--color-primary-dark)] py-3 text-base font-semibold text-black transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? 'Updating...' : 'Reset Password'}
                    </button>
                </form>

                <Link
                    to="/login"
                    className="mx-auto mt-5 block w-fit bg-[var(--color-primary-dark)] px-6 py-2 text-center text-sm font-medium text-black transition hover:bg-[var(--color-primary-hover)]"
                >
                    Back to login
                </Link>
            </div>
        </section>
    );
}