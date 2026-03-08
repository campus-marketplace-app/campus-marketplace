export default function Messages() {
    return (
        <section className="h-full w-full">
            <div className="grid h-full w-full grid-cols-[230px_1fr] overflow-hidden border border-[#b9b9b9] bg-[#cfcfcf]">
                <aside className="flex flex-col border-r border-[#b9b9b9] bg-[#ececec] p-4">
                    <input
                        type="text"
                        placeholder="search contacts"
                        className="mb-4 rounded bg-[#d0d0d0] px-3 py-2 text-sm text-black outline-none placeholder:text-black"
                    />

                    <div className="flex-1 rounded bg-[#d8d8d8] p-3 text-sm text-black">
                        No contacts yet.
                    </div>
                </aside>

                <div className="flex h-full flex-col border-l border-[#b9b9b9]">
                    <div className="mx-auto mt-3 w-[55%] bg-[#ececec] py-3 text-center text-2xl text-black">Messages</div>

                    <div className="flex flex-1 items-center justify-center overflow-auto px-4 pb-4 pt-6 sm:px-8">
                        <p className="text-xl text-black">Select a contact to start chatting.</p>
                    </div>

                    <div className="m-2 mt-0 bg-[#ececec] p-2">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            className="w-full bg-transparent px-2 py-2 text-lg text-black outline-none placeholder:text-black"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
