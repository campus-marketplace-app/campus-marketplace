import { useEffect, useState, type ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import { completePasswordReset } from "@campus-marketplace/backend";

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
            await completePasswordReset(code, password);
            setSuccessMessage('Your password has been reset successfully. You can now sign in with your new password.');
        } catch (err) {
            setServerError(err instanceof Error ? err.message : 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get("code") ?? "";
        if (!code) {
            setServerError('Reset link is invalid or expired. Please request a new password reset email.');
        } else {
            setCode(code);
            setServerError('');
        }
    }, []);

    return (
        <section className="flex min-h-[calc(100vh-64px)] w-full items-center justify-center bg-background-alt px-4 py-10 sm:px-8">
            <div className="card-form max-w-md p-6 sm:p-8">
                <h1 className="bg-primary-dark py-2 text-center text-3xl font-semibold uppercase tracking-wide text-black">
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
                        className="mt-2 bg-primary-dark py-3 text-base font-semibold text-black transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? 'Updating...' : 'Reset Password'}
                    </button>
                </form>

                <Link
                    to="/login"
                    className="mx-auto mt-5 block w-fit bg-primary-dark px-6 py-2 text-center text-sm font-medium text-black transition hover:bg-primary-hover"
                >
                    Back to login
                </Link>
            </div>
        </section>
    );
}