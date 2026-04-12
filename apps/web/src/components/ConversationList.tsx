import type { Conversation } from "@campus-marketplace/backend";

type ConversationListProps = {
    conversations: Conversation[];
    activeId: string | null;
    listingTitlesById: Record<string, string>;
    searchFilter: string;
    onSearchChange: (value: string) => void;
    onSelect: (id: string) => void;
    loading: boolean;
};

export default function ConversationList({
    conversations,
    activeId,
    listingTitlesById,
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
        <aside className="flex h-full min-h-0 w-full flex-col border-r border-[var(--color-border)] bg-[var(--color-background)] p-4">
            {/* Search bar */}
            <input
                type="text"
                placeholder="Search contacts"
                value={searchFilter}
                onChange={(e) => onSearchChange(e.target.value)}
                className="mb-4 rounded border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm text-black outline-none placeholder:text-black"
            />

            {/* Conversation list */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {loading && (
                    <p className="p-3 text-sm text-gray-500">Loading conversations...</p>
                )}

                {!loading && filtered.length === 0 && (
                    <div className="rounded bg-[var(--color-surface)] p-3 text-sm text-black">
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
                                    ? "bg-[var(--color-primary)] text-[var(--color-text-on-primary)]"
                                    : "text-black hover:bg-[var(--color-surface)]"
                            }`}
                        >
                            {convo.listing_id && (
                                <span
                                    className={`mb-0.5 block w-full truncate text-[11px] font-medium ${
                                        convo.id === activeId ? "text-white/80" : "text-black/70"
                                    }`}
                                >
                                    Listing: {listingTitlesById[convo.listing_id] ?? "Loading listing..."}
                                </span>
                            )}

                            <div className="flex items-center justify-between">
                                <span className="truncate text-sm font-semibold">
                                    {convo.other_user_display_name ?? "Unknown User"}
                                </span>

                                {/* Unread badge */}
                                {(convo.unread_count ?? 0) > 0 && convo.id !== activeId && (
                                    <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 text-xs font-bold text-[var(--color-text-on-primary)]">
                                        {convo.unread_count}
                                    </span>
                                )}
                            </div>

                            {/* Last message preview */}
                            {convo.last_message && (
                                <span
                                    className={`mt-0.5 block w-full truncate text-xs ${
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
