import { useEffect, useRef } from "react";
import { Send, ShoppingBag, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Message } from "@campus-marketplace/backend";

type ChatPanelProps = {
    messages: Message[];
    userId: string;
    otherUserName: string;
    messageInput: string;
    onInputChange: (value: string) => void;
    onSend: () => void;
    isSending?: boolean;
    loading: boolean;
    onBack?: () => void;
    listingId?: string | null;
    listingTitle?: string;
    isSeller?: boolean;
    listingStatus?: string | null;
};

// Format a timestamp like "3:42 PM".
function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
    });
}

export default function ChatPanel({
    messages,
    userId,
    otherUserName,
    messageInput,
    onInputChange,
    onSend,
    isSending = false,
    loading,
    onBack,
    listingId,
    listingTitle,
    isSeller,
    listingStatus,
}: ChatPanelProps) {
    // Auto-scroll to the bottom when new messages arrive.
    const bottomRef = useRef<HTMLDivElement>(null);

    const isSold = listingStatus === "sold";
    // Sellers can keep messaging on their own sold listings (e.g. coordinate pickup).
    // The DB trigger and backend sendMessage enforce this; the UI mirrors it here.
    const inputDisabled = isSold && !isSeller;

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    // Send on Enter key (but not Shift+Enter, in case they want multiline later).
    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    }

    return (
        <div className="flex h-full min-h-0 w-full flex-col border-l border-[var(--color-border)]">
            {/* Header */}
            <div className="border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3">
                <div className="flex items-center gap-2">
                    {/* Back button — only visible on mobile */}
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="mr-1 text-lg sm:hidden"
                            aria-label="Back to conversations"
                        >
                            ←
                        </button>
                    )}

                    {/* Role label on top, contact name below in larger type */}
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
                            {listingId ? (isSeller ? "Selling to" : "Buying from") : "Conversation"}
                        </p>
                        <span className="block truncate text-lg font-semibold text-[var(--color-text)]">
                            {otherUserName}
                        </span>
                    </div>
                </div>

                {/* Listing card — shown when conversation is linked to a listing */}
                {listingId && listingTitle && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                        <ShoppingBag size={14} className="shrink-0 text-[var(--color-text-muted)]" />
                        <span className="flex-1 truncate text-xs text-[var(--color-text)]">{listingTitle}</span>
                        <Link
                            to={`/listing/${listingId}`}
                            className="flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:opacity-80 transition-opacity shrink-0"
                        >
                            View <ArrowRight size={12} />
                        </Link>
                    </div>
                )}
            </div>

            {/* Message area */}
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-4 sm:px-8">
                {loading && (
                    <p className="self-center text-sm text-[var(--color-text-muted)]">Loading messages...</p>
                )}

                {!loading && messages.length === 0 && (
                    <p className="self-center text-sm text-[var(--color-text-muted)]">
                        No messages yet — say hello!
                    </p>
                )}

                {!loading &&
                    messages.map((msg) => {
                        const isMine = msg.sender_id === userId;
                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                            >
                                <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm font-medium break-words ${
                                        isMine
                                            ? "bg-[var(--color-surface)] text-[var(--color-text)]"
                                            : "bg-[var(--color-primary)] text-[var(--color-text-on-primary)]"
                                    }`}
                                >
                                    {msg.content}
                                </div>
                                <span className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                                    {formatTime(msg.created_at)}
                                </span>
                            </div>
                        );
                    })}

                {/* Scroll anchor */}
                <div ref={bottomRef} />
            </div>

            {/* Sold banner — different copy for buyer vs seller */}
            {isSold && (
                <div className="mx-2 mb-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-center text-sm text-[var(--color-text-muted)]">
                    {isSeller
                        ? "This item is marked sold. You can still message the buyer to coordinate."
                        : "This item has been sold. Messaging is no longer available."}
                </div>
            )}

            {/* Message input */}
            <div className="m-2 mt-0 flex items-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-background)] p-3">
                <input
                    type="text"
                    placeholder={inputDisabled ? "This conversation is closed" : "Type a message..."}
                    value={messageInput}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={inputDisabled}
                    className="flex-1 rounded-lg border border-[var(--color-border)] bg-transparent px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 transition-all placeholder:text-[var(--color-text-muted)] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                    type="button"
                    onClick={onSend}
                    disabled={!messageInput.trim() || inputDisabled || isSending}
                    className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-on-primary)] disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                    <Send size={16} />
                    Send
                </button>
            </div>
        </div>
    );
}
