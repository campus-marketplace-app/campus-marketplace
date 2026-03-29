import { useState, type ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from "@campus-marketplace/backend";

export default function ResetPassword() {
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
        <section className="flex min-h-[calc(100vh-64px)] w-full items-center justify-center bg-[var(--color-background-alt)] px-4 py-10 sm:px-8">
            <div className="w-full max-w-md border border-[var(--color-primary-dark)] bg-[var(--color-secondary-muted)] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.22)] sm:p-8">
                <h1 className="bg-[var(--color-primary-dark)] py-2 text-center text-3xl font-semibold uppercase tracking-wide text-black">
                    Reset Password
                </h1>

                <p className="mt-4 text-center text-base text-black sm:text-lg">
                    Enter your NJIT email and we will send a password reset link.
                </p>

                <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
                    <label htmlFor="reset-email" className="text-xs font-semibold uppercase tracking-wide text-black">
                        Email
                    </label>
                    <input
                        id="reset-email"
                        type="email"
                        placeholder="you@njit.edu"
                        className="w-full rounded-md border-b border-black bg-white px-4 py-3 text-base text-black outline-none placeholder:text-black/70"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            checkEmail(e.target.value);
                        }}
                        onBlur={() => checkEmail(email)}
                    />

                    {submitted && emailMessage !== '' ? <p className="text-sm text-white">{emailMessage}</p> : null}
                    {serverError ? <p className="text-sm text-white">{serverError}</p> : null}
                    {successMessage ? <p className="text-sm text-white">{successMessage}</p> : null}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 bg-[var(--color-primary-dark)] py-3 text-base font-semibold text-black transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
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