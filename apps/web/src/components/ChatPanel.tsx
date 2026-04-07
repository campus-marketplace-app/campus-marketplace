import { useEffect, useRef } from "react";
import { MoreVertical, Send } from "lucide-react";
import type { Message } from "@campus-marketplace/backend";

type ChatPanelProps = {
    messages: Message[];
    userId: string;
    otherUserName: string;
    messageInput: string;
    onInputChange: (value: string) => void;
    onSend: () => void;
    loading: boolean;
    onBack?: () => void;
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
    loading,
    onBack,
}: ChatPanelProps) {
    // Auto-scroll to the bottom when new messages arrive.
    const bottomRef = useRef<HTMLDivElement>(null);

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
        <div className="flex h-full w-full flex-col border-l border-[var(--color-border)]">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3">
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

                {/* Contact name + status */}
                <div className="flex-1">
                    <span className="text-base font-semibold text-gray-900">{otherUserName}</span>
                    <p className="text-xs text-[var(--color-text-muted)]">Active now</p>
                </div>

                {/* Options button */}
                <button
                    type="button"
                    className="p-2 hover:bg-[var(--color-surface)] rounded-lg transition-colors"
                    aria-label="More options"
                >
                    <MoreVertical size={18} className="text-[var(--color-text-muted)]" />
                </button>
            </div>

            {/* Message area */}
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4 sm:px-8">
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
                                            ? "bg-[var(--color-surface)] text-gray-900"
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

            {/* Message input */}
            <div className="m-2 mt-0 flex items-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-background)] p-3">
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 rounded-lg border border-[var(--color-border)] bg-transparent px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 transition-all placeholder:text-[var(--color-text-muted)]"
                />
                <button
                    type="button"
                    onClick={onSend}
                    disabled={!messageInput.trim()}
                    className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-on-primary)] disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                    <Send size={16} />
                    Send
                </button>
            </div>
        </div>
    );
}
