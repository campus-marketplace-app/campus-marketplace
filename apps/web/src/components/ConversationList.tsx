import type { Conversation } from "@campus-marketplace/backend";

type ConversationListProps = {
    conversations: Conversation[];
    activeId: string | null;
    searchFilter: string;
    onSearchChange: (value: string) => void;
    onSelect: (id: string) => void;
    loading: boolean;
};

export default function ConversationList({
    conversations,
    activeId,
    searchFilter,
    onSearchChange,
    onSelect,
    loading,
}: ConversationListProps) {
    // Filter conversations by display name using the search input.
    const filtered = conversations.filter((c) =>
        (c.other_user_display_name ?? "")
            .toLowerCase()
            .includes(searchFilter.toLowerCase()),
    );

    return (
        <aside className="flex flex-col border-r border-[#b9b9b9] bg-[#ececec] p-4">
            {/* Search bar */}
            <input
                type="text"
                placeholder="Search contacts"
                value={searchFilter}
                onChange={(e) => onSearchChange(e.target.value)}
                className="mb-4 rounded bg-[#d0d0d0] px-3 py-2 text-sm text-black outline-none placeholder:text-black"
            />

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
                {loading && (
                    <p className="p-3 text-sm text-gray-500">Loading conversations...</p>
                )}

                {!loading && filtered.length === 0 && (
                    <div className="rounded bg-[#d8d8d8] p-3 text-sm text-black">
                        {searchFilter ? "No matching contacts." : "No conversations yet."}
                    </div>
                )}

                {!loading &&
                    filtered.map((convo) => (
                        <button
                            key={convo.id}
                            type="button"
                            onClick={() => onSelect(convo.id)}
                            className={`mb-1 flex w-full cursor-pointer flex-col rounded px-3 py-2 text-left transition-colors ${
                                convo.id === activeId
                                    ? "bg-[#8f0010] text-white"
                                    : "text-black hover:bg-[#d8d8d8]"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="truncate text-sm font-semibold">
                                    {convo.other_user_display_name ?? "Unknown User"}
                                </span>

                                {/* Unread badge */}
                                {(convo.unread_count ?? 0) > 0 && convo.id !== activeId && (
                                    <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#8f0010] px-1.5 text-xs font-bold text-white">
                                        {convo.unread_count}
                                    </span>
                                )}
                            </div>

                            {/* Last message preview */}
                            {convo.last_message && (
                                <span
                                    className={`mt-0.5 truncate text-xs ${
                                        convo.id === activeId ? "text-white/80" : "text-gray-500"
                                    }`}
                                >
                                    {convo.last_message}
                                </span>
                            )}
                        </button>
                    ))}
            </div>
        </aside>
    );
}
