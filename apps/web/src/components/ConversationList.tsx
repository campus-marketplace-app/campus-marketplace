import { useMemo, useState } from 'react';
import { Search, ArchiveX, ChevronDown, ShoppingBag } from 'lucide-react';
import { getAvatarUrl } from '@campus-marketplace/backend';
import type { Conversation } from "@campus-marketplace/backend";
import { useConfirm } from '../contexts/ConfirmContext';

type ConversationListProps = {
    conversations: Conversation[];
    activeId: string | null;
    searchFilter: string;
    onSearchChange: (value: string) => void;
    onSelect: (id: string) => void;
    onArchive: (id: string) => void;
    userId: string;
    loading: boolean;
};

type ConversationGroup = {
    other_user_id: string;
    other_user_display_name?: string;
    other_user_avatar_path?: string | null;
    conversations: Conversation[];
    latest_message?: string;
    total_unread: number;
};

/** Returns up to 2 uppercase initials from a display name. */
const getInitials = (name?: string | null) =>
    (name ?? '?').slice(0, 2).toUpperCase();

function Avatar({ name, avatarPath }: { name?: string | null; avatarPath?: string | null }) {
    const url = avatarPath ? getAvatarUrl(avatarPath) : null;
    if (url) {
        return (
            <img
                src={url}
                alt={name ?? 'avatar'}
                className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
            />
        );
    }
    return (
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-[var(--color-text-on-primary)] text-sm font-semibold">
            {getInitials(name)}
        </div>
    );
}

export default function ConversationList({
    conversations,
    activeId,
    searchFilter,
    onSearchChange,
    onSelect,
    onArchive,
    loading,
}: ConversationListProps) {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const { confirm } = useConfirm();

    // Filter by display name, then group by other_user_id.
    const groups = useMemo<ConversationGroup[]>(() => {
        const filtered = conversations.filter((c) =>
            (c.other_user_display_name ?? '')
                .toLowerCase()
                .includes(searchFilter.toLowerCase()),
        );

        const map = new Map<string, ConversationGroup>();
        for (const convo of filtered) {
            const existing = map.get(convo.other_user_id);
            if (existing) {
                existing.conversations.push(convo);
                existing.total_unread += convo.unread_count ?? 0;
            } else {
                map.set(convo.other_user_id, {
                    other_user_id: convo.other_user_id,
                    other_user_display_name: convo.other_user_display_name,
                    other_user_avatar_path: convo.other_user_avatar_path,
                    conversations: [convo],
                    latest_message: convo.last_message,
                    total_unread: convo.unread_count ?? 0,
                });
            }
        }
        return Array.from(map.values());
    }, [conversations, searchFilter]);

    function toggleGroup(userId: string) {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    }

    function handleGroupClick(group: ConversationGroup) {
        if (group.conversations.length === 1) {
            onSelect(group.conversations[0].id);
        } else {
            toggleGroup(group.other_user_id);
        }
    }

    async function handleArchiveClick(e: React.MouseEvent, id: string) {
        e.stopPropagation();
        const confirmed = await confirm(
            'Archive conversation',
            'Archive this conversation? It will be removed from your list.'
        );
        if (confirmed) onArchive(id);
    }

    return (
        <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-background)] p-4">
            {/* Search bar */}
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

            {/* List */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {loading && (
                    <p className="p-3 text-sm text-[var(--color-text-muted)]">Loading conversations...</p>
                )}

                {!loading && groups.length === 0 && (
                    <div className="rounded bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text-muted)]">
                        {searchFilter ? 'No matching contacts.' : 'No conversations yet.'}
                    </div>
                )}

                {!loading && groups.map((group) => {
                    const isMulti = group.conversations.length > 1;
                    const isExpanded = expandedGroups.has(group.other_user_id);
                    const groupIsActive = !isMulti && group.conversations[0].id === activeId;

                    return (
                        <div key={group.other_user_id}>
                            {/* Group row */}
                            <button
                                type="button"
                                onClick={() => handleGroupClick(group)}
                                className={[
                                    'group w-full flex items-center gap-3 px-3 py-3 border-b border-[var(--color-border)] transition-colors text-left',
                                    groupIsActive
                                        ? 'border-l-4 border-l-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                        : 'border-l-4 border-l-transparent hover:bg-[var(--color-surface)]',
                                ].join(' ')}
                            >
                                <Avatar
                                    name={group.other_user_display_name}
                                    avatarPath={group.other_user_avatar_path}
                                />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="text-sm font-semibold truncate text-[var(--color-text)]">
                                            {group.other_user_display_name ?? 'Unknown User'}
                                        </span>

                                        <div className="flex items-center gap-1 shrink-0">
                                            {/* Conversation count badge */}
                                            {isMulti && (
                                                <span className="rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)]">
                                                    {group.conversations.length}
                                                </span>
                                            )}

                                            {/* Unread dot */}
                                            {group.total_unread > 0 && !groupIsActive && (
                                                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                                            )}

                                            {/* Archive — only for single-conversation groups */}
                                            {!isMulti && (
                                                <button
                                                    type="button"
                                                    aria-label="Archive conversation"
                                                    onClick={(e) => handleArchiveClick(e, group.conversations[0].id)}
                                                    className="hidden group-hover:flex items-center justify-center rounded p-0.5 text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
                                                >
                                                    <ArchiveX size={14} />
                                                </button>
                                            )}

                                            {/* Expand chevron for multi */}
                                            {isMulti && (
                                                <ChevronDown
                                                    size={14}
                                                    className={`text-[var(--color-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Last message preview — only shown when collapsed or single */}
                                    {(!isMulti || !isExpanded) && group.latest_message && (
                                        <span className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)]">
                                            {group.latest_message}
                                        </span>
                                    )}
                                </div>
                            </button>

                            {/* Sub-list — shown when group is expanded */}
                            {isMulti && isExpanded && (
                                <div className="bg-[var(--color-surface-alt)]">
                                    {group.conversations.map((convo) => (
                                        <button
                                            key={convo.id}
                                            type="button"
                                            onClick={() => onSelect(convo.id)}
                                            className={[
                                                'group w-full flex items-center gap-2 pl-14 pr-3 py-2.5 border-b border-[var(--color-border)] transition-colors text-left',
                                                convo.id === activeId
                                                    ? 'border-l-4 border-l-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                                    : 'border-l-4 border-l-transparent hover:bg-[var(--color-surface)]',
                                            ].join(' ')}
                                        >
                                            <ShoppingBag size={13} className="shrink-0 text-[var(--color-text-muted)]" />

                                            <span className="flex-1 truncate text-xs text-[var(--color-text)]">
                                                {convo.listing_title ?? 'General chat'}
                                            </span>

                                            <div className="flex items-center gap-1 shrink-0">
                                                {/* Role badge */}
                                                {convo.listing_id && (
                                                    <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary)]">
                                                        {convo.is_seller ? 'Seller' : 'Buyer'}
                                                    </span>
                                                )}

                                                {/* Unread dot */}
                                                {(convo.unread_count ?? 0) > 0 && convo.id !== activeId && (
                                                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                                                )}

                                                {/* Archive */}
                                                <button
                                                    type="button"
                                                    aria-label="Archive conversation"
                                                    onClick={(e) => handleArchiveClick(e, convo.id)}
                                                    className="hidden group-hover:flex items-center justify-center rounded p-0.5 text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
                                                >
                                                    <ArchiveX size={13} />
                                                </button>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}
