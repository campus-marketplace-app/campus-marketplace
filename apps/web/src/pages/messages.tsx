import { useEffect, useState } from "react";
import { useOutletContext, useParams, Link } from "react-router-dom";
import {
    getConversationsByUser,
    getMessages,
    sendMessage,
    markMessagesRead,
    subscribeToMessages,
    getSessionFromTokens,
} from "@campus-marketplace/backend";
import type { Conversation, Message } from "@campus-marketplace/backend";
import type { OutletContext } from "../features/types";
import ConversationList from "../components/ConversationList";
import ChatPanel from "../components/ChatPanel";

export default function Messages() {
    const { user } = useOutletContext<OutletContext>();
    const { conversationId: routeConvoId } = useParams<{ conversationId?: string }>();

    // --- state ---
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(
        routeConvoId ?? null,
    );
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState("");
    const [searchFilter, setSearchFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [chatLoading, setChatLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<"list" | "chat">("list");

    // --- restore Supabase session so RLS recognizes the user ---
    useEffect(() => {
        const accessToken = localStorage.getItem("access_token");
        const refreshToken = localStorage.getItem("refresh_token");
        if (accessToken && refreshToken) {
            getSessionFromTokens(accessToken, refreshToken).catch(console.error);
        }
    }, []);

    // --- load conversations on mount ---
    useEffect(() => {
        if (!user) return;

        setLoading(true);
        getConversationsByUser(user.id)
            .then(setConversations)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [user?.id]);

    // --- poll conversations every 15 s so the sidebar stays fresh ---
    useEffect(() => {
        if (!user) return;

        const interval = setInterval(() => {
            getConversationsByUser(user.id)
                .then(setConversations)
                .catch(console.error);
        }, 15_000);

        return () => clearInterval(interval);
    }, [user?.id]);

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
                if (!cancelled) setError(err.message);
            })
            .finally(() => {
                if (!cancelled) setChatLoading(false);
            });

        // Mark incoming messages as read.
        markMessagesRead(activeConversationId, user.id).catch(console.error);

        // Clear the unread badge in the sidebar right away.
        setConversations((prev) =>
            prev.map((c) =>
                c.id === activeConversationId ? { ...c, unread_count: 0 } : c,
            ),
        );

        // Subscribe to new messages in real time.
        const { unsubscribe } = subscribeToMessages(activeConversationId, (newMsg) => {
            if (cancelled) return;

            // Deduplicate — the optimistic append from handleSend may already have it.
            setMessages((prev) =>
                prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg],
            );

            // Update the sidebar preview for this conversation.
            setConversations((prev) =>
                prev.map((c) =>
                    c.id === activeConversationId
                        ? { ...c, last_message: newMsg.content, unread_count: 0 }
                        : c,
                ),
            );

            // If the message is from the other person, mark it read.
            if (newMsg.sender_id !== user.id) {
                markMessagesRead(activeConversationId, user.id).catch(console.error);
            }
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [activeConversationId, user?.id]);

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

            // Update sidebar preview.
            setConversations((prev) =>
                prev.map((c) =>
                    c.id === activeConversationId
                        ? { ...c, last_message: sent.content }
                        : c,
                ),
            );
        } catch (err) {
            console.error("Failed to send message:", err);
            setError("Failed to send message. Please try again.");
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
            <div className="auth-prompt">
                <div className="auth-prompt-card">
                    <h2 className="mb-4 text-center text-2xl font-bold text-black">
                        Sign in required
                    </h2>
                    <p className="mb-6 text-center text-gray-600">
                        You need to be logged in to view your messages.
                    </p>
                    <Link
                        to="/login"
                        className="block rounded bg-primary px-4 py-2 text-center font-semibold text-on-primary"
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
        <section className="h-full w-full">
            {errorBanner}

            <div className="grid h-full w-full grid-cols-1 overflow-hidden border border-border bg-surface-alt sm:grid-cols-[230px_1fr]">
                {/* Sidebar — hidden on mobile when viewing a chat */}
                <div className={`${mobileView === "chat" ? "hidden sm:flex" : "flex"}`}>
                    <ConversationList
                        conversations={conversations}
                        activeId={activeConversationId}
                        searchFilter={searchFilter}
                        onSearchChange={setSearchFilter}
                        onSelect={handleSelectConversation}
                        loading={loading}
                    />
                </div>

                {/* Chat panel — hidden on mobile when viewing the list */}
                <div className={`${mobileView === "list" ? "hidden sm:flex" : "flex"} h-full`}>
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
                        />
                    ) : (
                        <div className="flex h-full w-full flex-col border-l border-border">
                            <div className="mx-auto mt-3 w-[55%] bg-background py-3 text-center text-2xl text-black">
                                Messages
                            </div>
                            <div className="flex flex-1 items-center justify-center px-4 pb-4 pt-6 sm:px-8">
                                <p className="text-xl text-black">
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
