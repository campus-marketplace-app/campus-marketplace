export default function Signup() {
    return (
        <section className="flex h-full w-full items-center justify-center">
            <div className="w-[400px] rounded border border-[#b9b9b9] bg-[#cfcfcf] p-6">
                <h1 className="mb-4 text-center text-2xl text-black">Signup</h1>
                <form className="flex flex-col gap-4">
                    <input
                        type="text"
                        placeholder="Username"
                        className="rounded bg-[#d0d0d0] px-3 py-2 text-sm text-black outline-none placeholder:text-black"
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        className="rounded bg-[#d0d0d0] px-3 py-2 text-sm text-black outline-none placeholder:text-black"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="rounded bg-[#d0d0d0] px-3 py-2 text-sm text-black outline-none placeholder:text-black"
                    />
                    <button
                        type="submit"
                        className="rounded bg-[#ececec] px-3 py-2 text-sm text-black hover:bg-[#d8d8d8]"
                    >
                        Signup
                    </button>
                </form>
            </div>
        </section>
    );
}