import { useState } from 'react';
import { Link } from 'react-router-dom';


export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rePassword, setRePassword] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [rePasswordMessage, setRePasswordMessage] = useState('');

    const checkEmail = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            setEmailMessage('Please enter a valid email address.');
        }
        else {
            setEmailMessage('');
        }

        return;
    }
    const checkPassword = () => {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

        if (!passwordRegex.test(password)) {
            setPasswordMessage('Password must be at least 6 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.');
        }
        else {
            setPasswordMessage('');
        }

        return;
    }

    const checkRePassword = () => {
        if (password !== rePassword) {
            setRePasswordMessage('Passwords do not match.');
        }
        else {
            setRePasswordMessage('');
        }
    }


    return (
        <section className="flex h-full min-h-[calc(100vh-64px)] w-full items-start overflow-y-auto bg-[#dddddd] px-4 py-8 sm:px-8">
            <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-[1.6fr_1fr] md:items-center">
                <div className="px-1 text-black sm:px-6">
                    <p className="mt-4 text-base font-normal sm:mt-6 sm:text-2xl">
                        Create your account to start buying and selling with other students on campus.
                        Join the marketplace and connect with your campus community.
                    </p>
                </div>

                <div className="mx-auto w-full max-w-[380px] border border-[#7d5558] bg-[#c86d72] px-5 pb-6 pt-4 shadow-[0_2px_8px_rgba(0,0,0,0.22)] sm:px-7">
                    <h1 className="mb-8 bg-[#8c0010] py-2 text-center text-3xl uppercase tracking-wide text-black">
                        Signup
                    </h1>

                    <form className="flex flex-col gap-7" onSubmit={(e) => e.preventDefault()}>
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
                                }
                            }
                            onBlur={checkEmail}
                        />
                        {emailMessage !== '' ?
                            (<p className="text-sm text-white">{emailMessage}</p>) : null
                        }

                        <input
                            type="password"
                            placeholder="Password"
                            className="border-b border-black bg-transparent pb-1 text-center text-base text-black outline-none placeholder:text-black/90" value={password}
                            onChange={
                                (e) => {
                                    setPassword(e.target.value);
                                    checkPassword();
                                }
                            }
                        />
                        {passwordMessage !== '' ?
                            (<p className="text-sm text-white">{passwordMessage}</p>) : null
                        }

                        <input
                            type="password"
                            placeholder="Re-enter Password"
                            className="border-b border-black bg-transparent pb-1 text-center text-base text-black outline-none placeholder:text-black/90" value={rePassword}
                            onChange={
                                (e) => {
                                    setRePassword(e.target.value);
                                    checkRePassword();
                                }
                            }
                        />
                        {rePasswordMessage !== '' ?
                            (<p className="text-sm text-white">{rePasswordMessage}</p>) : null
                        }

                        <button
                            type="submit"
                            className="bg-[#8c0010] py-2 text-lg text-black transition hover:bg-[#9f0a1b]"
                        >
                            Signup
                        </button>
                    </form>

                    <Link
                        to="/login"
                        className="mx-auto mt-4 block w-fit bg-[#8c0010] px-8 py-2 text-center text-sm text-black transition hover:bg-[#9f0a1b]"
                    >
                        back to login
                    </Link>
                </div>
            </div>
        </section>
    );
}