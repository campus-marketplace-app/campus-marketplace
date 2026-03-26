import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, type ComponentProps } from 'react';
import { signInWithEmail } from "@campus-marketplace/backend";
import { getThemeBySchoolCode } from '@campus-marketplace/backend';


export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [theme, setTheme] = useState<any>(null);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                // Get school code from environment variable and convert to number
                const schoolCode = parseInt(import.meta.env.VITE_SCHOOL_CODE || '0');
                // Call backend function to fetch theme colors from database
                const fetchedTheme = await getThemeBySchoolCode(schoolCode);
                // Store the fetched theme in state so components can use it
                setTheme(fetchedTheme);
            } catch (error) {
                // Log error if theme fetch fails
                console.error('Failed to load theme:', error);
            }
        };
        // Run this effect when page first loads
        loadTheme();
    }, []);


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
        <section className="relative min-h-[calc(100vh-64px)]"> /* Background layer with z-index: 0 - goes behind everything */
            <div
                style={{
                    backgroundImage: 'url(/login_page.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'absolute', //stretch to fill the section
                    inset: 0,
                    zIndex: 0 //background layer goes behind the content
                }}
            />

            <div style={{ position: 'relative', zIndex: 10 }} className="flex h-full w-full items-center px-4 py-8 sm:px-8">
                <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-[1.6fr_1fr] md:items-center">
                    <div className="px-2 text-black sm:px-6">
                        <p className="text-2xl font-normal tracking-tight sm:text-4xl">
                            Welcome to Campus Marketplace!
                        </p>
                        <p className="mt-4 text-base font-normal sm:mt-6 sm:text-2xl">
                            Your one-stop shop for buying and selling items on campus!
                            Join our community today and start trading with your fellow students!
                        </p>
                        <p className="mt-12 text-xl font-normal sm:mt-16 sm:text-3xl">
                            Follow us on our social media:
                        </p>
                    </div>

                    <div
                        className="mx-auto w-full max-w-[380px] px-5 pb-6 pt-4 shadow-[0_2px_8px_rgba(0,0,0,0.22)] sm:px-7"
                        style={{
                            borderColor: theme?.accent_color,
                            backgroundColor: theme?.secondary_color,
                            border: `1px solid ${theme?.accent_color}`
                        }}
                    >
                        <h1
                            className="mb-8 py-2 text-center text-3xl uppercase tracking-wide text-black"
                            style={{ backgroundColor: theme?.primary_color }}
                        >
                            Login
                        </h1>

                        <form className="flex flex-col gap-7" onSubmit={handleSubmit}>
                            <input
                                type="email"
                                placeholder="Njit Email"
                                className="border-b border-black bg-transparent pb-1 text-center text-base text-black outline-none placeholder:text-black/90"
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
                                className="border-b border-black bg-transparent pb-1 text-center text-base text-black outline-none placeholder:text-black/90"
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
                                style={{ backgroundColor: theme?.button_style }}
                                className="py-2 text-lg text-black transition"
                            >
                                Submit
                            </button>
                        </form>

                        <Link
                            to="/signup"
                            style={{ backgroundColor: theme?.button_style }}
                            className="mx-auto mt-4 block w-fit px-8 py-2 text-center text-sm text-black transition"
                        >
                            create new account
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}