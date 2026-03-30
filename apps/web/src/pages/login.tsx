import { Link, useNavigate } from 'react-router-dom';
import { useState, type ComponentProps } from 'react';
import { signInWithEmail } from "@campus-marketplace/backend";
import { useTheme } from '../contexts/ThemeContext';

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
                navigate("/", {replace: true});
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
            className="flex h-full min-h-[calc(100vh-64px)] w-full items-center bg-background-alt px-4 py-8 sm:px-8"
            style={loginBgUrl ? { backgroundImage: `url(${loginBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
            <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-[1.6fr_1fr] md:items-center">
                <div className="px-2 text-black sm:px-6">
                    <p className="text-2xl font-normal tracking-tight sm:text-4xl">
                        Welcome to {schoolName} Marketplace!
                    </p>
                    <p className="mt-4 text-base font-normal sm:mt-6 sm:text-2xl">
                        Your one-stop shop for buying and selling items on campus!
                        Join our community today and start trading with your fellow students!
                    </p>
                    <p className="mt-12 text-xl font-normal sm:mt-16 sm:text-3xl">
                        Follow us on our social media:
                    </p>
                </div>

                <div className="card-form max-w-[380px] px-5 pb-6 pt-4 sm:px-7">
                    <h1 className="mb-8 bg-primary-dark py-2 text-center text-3xl uppercase tracking-wide text-black">
                        Login
                    </h1>

                    <form className="flex flex-col gap-7" onSubmit={handleSubmit}>
                        <input
                            type="email"
                            placeholder="Njit Email"
                            className="input-underline"
                            value={email}
                            onChange={
                                (e) => {
                                    setEmail(e.target.value);
                                }
                            }
                        />
                        {submitted && emailMessage !== '' ?
                            (<p className="text-sm text-white">
                                {emailMessage}</p>) : null}
                        <input
                            type="password"
                            placeholder="Password"
                            className="input-underline"
                            value={password}
                            onChange={
                                (e) => {
                                    setPassword(e.target.value);
                                }
                            }
                        />
                        {submitted && passwordMessage !== '' ? (<p className="text-sm text-white">{passwordMessage}</p>) : null}

                        <Link to="/reset-email">
                            <p className="text-sm text-center text-white underline">
                                Forgot password?
                            </p>
                        </Link>

                        <button
                            type="submit"
                            className="bg-primary-dark py-2 text-lg text-black transition hover:bg-primary-hover"
                        >
                            Submit
                        </button>
                    </form>

                    <Link
                        to="/signup"
                        className="mx-auto mt-4 block w-fit bg-primary-dark px-8 py-2 text-center text-sm text-black transition hover:bg-primary-hover"
                    >
                        create new account
                    </Link>
                </div>
            </div>
        </section>
    );
}