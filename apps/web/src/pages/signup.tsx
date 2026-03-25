import { useState, useEffect, type ComponentProps } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getThemeBySchoolCode } from '@campus-marketplace/backend';


export default function Signup() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rePassword, setRePassword] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [rePasswordMessage, setRePasswordMessage] = useState('');
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

    const handleSubmit: ComponentProps<'form'>['onSubmit'] = async (e) => {
        if (!e) return;
        e.preventDefault();
        setSubmitted(true);
        const isEmailValid = checkEmail(email);
        const isPasswordValid = checkPassword(password);
        const isRePasswordValid = checkRePassword(password, rePassword);

        if (isEmailValid && isPasswordValid && isRePasswordValid && email !== '' && password !== '') {
            alert('Login successful!');
            navigate('/login', { replace: true });
        }
        if (!isEmailValid || !isPasswordValid || !isRePasswordValid) {
            alert('Please fix the errors before submitting.');
        }
    }


    return (
        <section className="relative min-h-[calc(100vh-64px)]">
            <div
                style={{
                    backgroundImage: 'url(/signin_page.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'absolute',
                    inset: 0,
                    zIndex: 0
                }}
            />

            <div style={{ position: 'relative', zIndex: 10 }} className="flex h-full w-full items-start overflow-y-auto px-4 py-8 sm:px-8">            <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-[1.6fr_1fr] md:items-center">
                <div className="px-1 text-black sm:px-6">
                    <p className="mt-4 text-base font-normal sm:mt-6 sm:text-2xl">
                        Create your account to start buying and selling with other students on campus.
                        Join the marketplace and connect with your campus community.
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
                        Signup
                    </h1>

                    <form className="flex flex-col gap-7" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            placeholder="Username"
                            className="border-b border-black bg-transparent pb-1 text-center text-base text-black outline-none placeholder:text-black/90"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            className="border-b border-black bg-transparent pb-1 text-center text-base text-black outline-none placeholder:text-black/90"
                            value={email}
                            onChange={
                                (e) => {
                                    setEmail(e.target.value);
                                    checkEmail(e.target.value);
                                }
                            }
                            onBlur={() => checkEmail(email)}
                        />
                        {submitted && emailMessage !== '' ?
                            (<p className="text-sm text-white">{emailMessage}</p>) : null
                        }

                        <input
                            type="password"
                            placeholder="Password"
                            className="border-b border-black bg-transparent pb-1 text-center text-base text-black outline-none placeholder:text-black/90" value={password}
                            onChange={
                                (e) => {
                                    setPassword(e.target.value);
                                    checkPassword(e.target.value);
                                    checkRePassword(e.target.value, rePassword);
                                }
                            }
                        />
                        {submitted && passwordMessage !== '' ?
                            (<p className="text-sm text-white">{passwordMessage}</p>) : null
                        }

                        <input
                            type="password"
                            placeholder="Re-enter Password"
                            className="border-b border-black bg-transparent pb-1 text-center text-base text-black outline-none placeholder:text-black/90" value={rePassword}
                            onChange={
                                (e) => {
                                    const nextRePassword = e.target.value;
                                    setRePassword(nextRePassword);
                                    checkRePassword(password, nextRePassword);
                                }
                            }
                        />
                        {submitted && rePasswordMessage !== '' ?
                            (<p className="text-sm text-white">{rePasswordMessage}</p>) : null
                        }

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
                        back to login
                    </Link>
                </div>
            </div>
            </div>
        </section>
    );
}