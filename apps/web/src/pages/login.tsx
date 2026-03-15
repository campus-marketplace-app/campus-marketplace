import { Link } from 'react-router-dom';

export default function Login() {
    return (
        <section className="flex h-full min-h-[calc(100vh-64px)] w-full items-center bg-[#dddddd] px-4 py-8 sm:px-8">
            <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-[1.6fr_1fr] md:items-center">
                <div className="px-2 text-black sm:px-6">
                    <p className="text-2xl font-normal tracking-tight sm:text-4xl">
                        Welcome to Campus Marketplace!
                    </p>
                    <p className="mt-4 text-base font-normal sm:mt-6 sm:text-2xl">
                        Your one-stop shop for buying and selling items on campus! 
                        Whether you're looking to declutter your dorm room or find great deals on textbooks, 
                        our platform connects students in a safe and convenient way. 
                        Join our community today and start trading with your fellow students!
                    </p>
                    <p className="mt-12 text-xl font-normal sm:mt-16 sm:text-3xl">
                        Follow us on our social media:
                    </p>
                </div>

                <div className="mx-auto w-full max-w-[380px] border border-[#7d5558] bg-[#c86d72] px-5 pb-6 pt-4 shadow-[0_2px_8px_rgba(0,0,0,0.22)] sm:px-7">
                    <h1 className="mb-8 bg-[#8c0010] py-2 text-center text-3xl uppercase tracking-wide text-black">
                        Login
                    </h1>

                    <form className="flex flex-col gap-7" onSubmit={(e) => e.preventDefault()}>
                        <input
                            type="email"
                            placeholder="Email"
                            className="border-b border-black bg-transparent pb-1 text-center text-base text-black outline-none placeholder:text-black/90"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            className="border-b border-black bg-transparent pb-1 text-center text-base text-black outline-none placeholder:text-black/90"
                        />
                        <button
                            type="submit"
                            className="bg-[#8c0010] py-2 text-lg text-black transition hover:bg-[#9f0a1b]"
                        >
                            Login
                        </button>
                    </form>

                    <Link
                        to="/signup"
                        className="mx-auto mt-4 block w-fit bg-[#8c0010] px-8 py-2 text-center text-sm text-black transition hover:bg-[#9f0a1b]"
                    >
                        create new account
                    </Link>
                </div>
            </div>
        </section>
    );
}