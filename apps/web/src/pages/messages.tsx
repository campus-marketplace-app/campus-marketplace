import { useEffect, useState } from "react";
import { useOutletContext, useParams, Link } from "react-router-dom";
import {
    getListingWithDetails,
    getMessages,
    sendMessage,
    markMessagesRead,
    subscribeToMessages,
    getSessionFromTokens,
    archiveConversation,
    subscribeToConversations,
} from "@campus-marketplace/backend";
import type { Message } from "@campus-marketplace/backend";
import type { OutletContext } from "../features/types";
import ConversationList from "../components/ConversationList";
import ChatPanel from "../components/ChatPanel";
import { useConversations, useInvalidateConversations } from "../hooks/useConversations";

export default function Messages() {
    const { user } = useOutletContext<OutletContext>();
    const { conversationId: routeConvoId } = useParams<{ conversationId?: string }>();

    // --- state ---
    const [activeConversationId, setActiveConversationId] = useState<string | null>(
        routeConvoId ?? null,
    );
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState("");
    const [searchFilter, setSearchFilter] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<"list" | "chat">("list");
    const [listingTitlesById, setListingTitlesById] = useState<Record<string, string>>({});

    // --- cached conversation list (replaces manual fetch + 15s polling) ---
    const { data: conversations = [], isLoading: loading } = useConversations(user?.id);
    const { invalidate: invalidateConversations } = useInvalidateConversations();

    // --- restore Supabase session so RLS recognizes the user ---
    useEffect(() => {
        const accessToken = localStorage.getItem("access_token");
        const refreshToken = localStorage.getItem("refresh_token");
        if (accessToken && refreshToken) {
            getSessionFromTokens(accessToken, refreshToken).catch(console.error);
        }
    }, []);

    // --- realtime subscription on conversations (replaces 15s setInterval polling) ---
    // When any conversation we're in gets updated (new message, read status), we invalidate
    // the TanStack Query cache so it refetches — without polling.
    useEffect(() => {
        if (!user || conversations.length === 0) return;

        const conversationIds = conversations.map((c) => c.id);
        const { unsubscribe } = subscribeToConversations(conversationIds, () => {
            invalidateConversations(user.id);
        });

        return unsubscribe;
        // conversations.length is intentional — re-subscribe when the list grows.
        // invalidateConversations is a stable ref from useQueryClient; user is stable per session.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, conversations.length]);

    // --- load messages + realtime subscription when active conversation changes ---
    useEffect(() => {
        if (!activeConversationId || !user) return;

        let cancelled = false;

        // Fetch messages for the selected conversation.
        setChatLoading(true);
        getMessages(activeConversationId)
            .then((msgs) => {
                if (!cancelled) setMessages(msgs);
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : String(err));
            })
            .finally(() => {
                if (!cancelled) setChatLoading(false);
            });

        // Mark incoming messages as read.
        markMessagesRead(activeConversationId, user.id).catch(console.error);

        // Subscribe to new messages in real time.
        const { unsubscribe } = subscribeToMessages(activeConversationId, (newMsg) => {
            if (cancelled) return;

            // Deduplicate — the optimistic append from handleSend may already have it.
            setMessages((prev) =>
                prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg],
            );

            // Invalidate the conversation list so the sidebar preview updates.
            invalidateConversations(user.id);

            // If the message is from the other person, mark it read.
            if (newMsg.sender_id !== user.id) {
                markMessagesRead(activeConversationId, user.id).catch(console.error);
            }
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
        // invalidateConversations is a stable ref from useQueryClient; intentionally omitted.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeConversationId, user?.id]);

    // --- fetch listing titles for conversations (manual cache kept — getListingWithDetails
    //     is deduplicated by TanStack Query across the app but this sidebar needs the title
    //     as a plain string without mounting a full hook per conversation row) ---
    useEffect(() => {
        const listingIds = Array.from(
            new Set(
                conversations
                    .map((conversation) => conversation.listing_id)
                    .filter((id): id is string => Boolean(id && id.trim())),
            ),
        );

        const missingListingIds = listingIds.filter((id) => !listingTitlesById[id]);
        if (missingListingIds.length === 0) {
            return;
        }

        let cancelled = false;

        const loadListingTitles = async () => {
            const entries = await Promise.all(
                missingListingIds.map(async (listingId) => {
                    try {
                        const listing = await getListingWithDetails(listingId);
                        return [listingId, listing.title ?? "Untitled listing"] as const;
                    }
                    catch {
                        return [listingId, "Unknown listing"] as const;
                    }
                }),
            );

            if (cancelled) {
                return;
            }

            setListingTitlesById((prev) => {
                const next = { ...prev };
                for (const [listingId, title] of entries) {
                    next[listingId] = title;
                }
                return next;
            });
        };

        void loadListingTitles();

        return () => {
            cancelled = true;
        };
    }, [conversations, listingTitlesById]);

    // --- send a message ---
    async function handleSend() {
        if (!activeConversationId || !user || !messageInput.trim()) return;

        const content = messageInput.trim();
        setMessageInput("");

        try {
            const sent = await sendMessage(activeConversationId, user.id, content);

            // Append optimistically (realtime will also fire — dedup handles it).
            setMessages((prev) =>
                prev.some((m) => m.id === sent.id) ? prev : [...prev, sent],
            );

            // Invalidate the conversation list so the sidebar preview (last message) updates.
            invalidateConversations(user.id);
        } catch (err) {
            console.error("Failed to send message:", err);
            setError("Failed to send message. Please try again.");
        }
    }

    // --- archive a conversation ---
    async function handleArchive(id: string) {
        if (!user) return;
        try {
            await archiveConversation(id, user.id);
            // Invalidate so the archived conversation disappears from the list.
            invalidateConversations(user.id);
            if (id === activeConversationId) {
                setActiveConversationId(null);
                setMessages([]);
            }
        } catch (err) {
            console.error("Failed to archive conversation:", err);
            setError("Failed to archive conversation. Please try again.");
        }
    }

    // --- select a conversation ---
    function handleSelectConversation(id: string) {
        if (id === activeConversationId) {
            setMobileView("chat");
            return;
        }
        setActiveConversationId(id);
        setMessages([]);
        setError(null);
        setMobileView("chat");
    }

    // --- find the active conversation for the header name ---
    const activeConvo = conversations.find((c) => c.id === activeConversationId);

    // --- auth guard ---
    if (!user) {
        return (
            <div className="flex h-full min-h-[calc(100vh-64px)] w-full items-center justify-center bg-black/50">
                <div className="mx-auto w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
                    <h2 className="mb-4 text-center text-2xl font-bold text-black">
                        Sign in required
                    </h2>
                    <p className="mb-6 text-center text-gray-600">
                        You need to be logged in to view your messages.
                    </p>
                    <Link
                        to="/login"
                        className="block rounded bg-[var(--color-primary)] px-4 py-2 text-center font-semibold text-[var(--color-text-on-primary)]"
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    // --- error banner ---
    const errorBanner = error && (
        <div className="bg-red-100 px-4 py-2 text-sm text-red-700">
            {error}
            <button
                type="button"
                onClick={() => setError(null)}
                className="ml-2 font-bold"
            >
                ✕
            </button>
        </div>
    );

    return (
        <section className="h-full min-h-0 w-full min-w-0 overflow-hidden">
            {errorBanner}

            <div className="grid h-full min-h-0 w-full min-w-0 grid-cols-1 overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-alt)] sm:grid-cols-[230px_minmax(0,1fr)]">
                {/* Sidebar — hidden on mobile when viewing a chat */}
                <div className={`${mobileView === "chat" ? "hidden sm:flex" : "flex"} h-full min-h-0 min-w-0 overflow-hidden`}>
                    <ConversationList
                        conversations={conversations}
                        activeId={activeConversationId}
                        searchFilter={searchFilter}
                        onSearchChange={setSearchFilter}
                        onSelect={handleSelectConversation}
                        onArchive={handleArchive}
                        userId={user.id}
                        loading={loading}
                    />
                </div>

                {/* Chat panel — hidden on mobile when viewing the list */}
                <div className={`${mobileView === "list" ? "hidden sm:flex" : "flex"} h-full min-h-0 min-w-0`}>
                    {activeConvo ? (
                        <ChatPanel
                            messages={messages}
                            userId={user.id}
                            otherUserName={activeConvo.other_user_display_name ?? "Unknown User"}
                            messageInput={messageInput}
                            onInputChange={setMessageInput}
                            onSend={handleSend}
                            loading={chatLoading}
                            onBack={() => setMobileView("list")}
                            listingId={activeConvo.listing_id}
                            listingTitle={activeConvo.listing_title}
                            isSeller={activeConvo.is_seller}
                        />
                    ) : (
                        <div className="flex h-full w-full flex-col border-l border-[var(--color-border)]">
                            <div className="mx-auto mt-3 w-[55%] bg-[var(--color-background)] py-3 text-center text-2xl text-[var(--color-text)]">
                                Messages
                            </div>
                            <div className="flex flex-1 items-center justify-center px-4 pb-4 pt-6 sm:px-8">
                                <p className="text-xl text-[var(--color-text)]">
                                    Select a contact to start chatting.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
