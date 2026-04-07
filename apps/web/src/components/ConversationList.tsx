import { Search } from 'lucide-react';
import type { Conversation } from "@campus-marketplace/backend";

type ConversationListProps = {
    conversations: Conversation[];
    activeId: string | null;
    searchFilter: string;
    onSearchChange: (value: string) => void;
    onSelect: (id: string) => void;
    loading: boolean;
};

/** Returns up to 2 uppercase initials from a display name. */
const getInitials = (name?: string | null) =>
    (name ?? '?').slice(0, 2).toUpperCase();

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
        <aside className="flex h-full min-h-0 w-full flex-col border-r border-[var(--color-border)] bg-[var(--color-background)] p-4">
            {/* Search bar with icon */}
            <div className="relative mb-4">
                <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-border)] pointer-events-none"
                />
                <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchFilter}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 transition-all placeholder:text-[var(--color-text-muted)]"
                />
            </div>

            {/* Conversation list */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {loading && (
                    <p className="p-3 text-sm text-[var(--color-text-muted)]">Loading conversations...</p>
                )}

                {!loading && filtered.length === 0 && (
                    <div className="rounded bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text-muted)]">
                        {searchFilter ? "No matching contacts." : "No conversations yet."}
                    </div>
                )}

                {!loading &&
                    filtered.map((convo) => (
                        <button
                            key={convo.id}
                            type="button"
                            onClick={() => onSelect(convo.id)}
                            className={[
                                'w-full flex items-center gap-3 px-3 py-3 border-b border-[var(--color-border)] transition-colors text-left',
                                convo.id === activeId
                                    ? 'border-l-4 border-l-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                    : 'border-l-4 border-l-transparent hover:bg-[var(--color-surface)]',
                            ].join(' ')}
                        >
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-[var(--color-text-on-primary)] text-sm font-semibold">
                                {getInitials(convo.other_user_display_name)}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold truncate text-gray-900">
                                        {convo.other_user_display_name ?? 'Unknown User'}
                                    </span>

                                    {/* Unread dot */}
                                    {(convo.unread_count ?? 0) > 0 && convo.id !== activeId && (
                                        <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0 ml-2" />
                                    )}
                                </div>

                                {/* Last message preview */}
                                {convo.last_message && (
                                    <span className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)]">
                                        {convo.last_message}
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
            </div>
        </aside>
    );
}
