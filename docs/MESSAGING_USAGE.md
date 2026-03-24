# Messaging — Usage Guide

> **Rule:** Never import `@supabase/supabase-js` in the frontend. Use `@campus-marketplace/backend`.

## Import

```ts
import {
  createOrGetConversation,
  getConversationById,
  getConversations,
  getMessages,
  sendMessage,
  markConversationAsRead,
  subscribeToConversations,
  subscribeToMessages,
} from "@campus-marketplace/backend";
import type {
  Message,
  ConversationSummary,
  ConversationParticipant,
  CreateConversationInput,
  GetMessagesOptions,
} from "@campus-marketplace/backend";
```

## Types

```ts
interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  read_at: string | null   // ISO-8601; null until the recipient reads it
  created_at: string       // ISO-8601
}

interface ConversationSummary {
  id: string
  listing_id: string | null
  listing: {
    id: string
    title: string
    status: string
  } | null                 // null for conversations not tied to a listing
  other_participant: {
    user_id: string
    display_name: string
    avatar_path: string | null
    avatar_url: string | null  // resolved public URL; null if no avatar is set
  }
  last_message: {
    id: string
    sender_id: string
    content: string
    created_at: string
  } | null                 // null for empty conversations
  unread_count: number     // messages from the other participant not yet read
  created_at: string
  updated_at: string       // bumped on every new message; use for inbox sort order
}
```

---

## createOrGetConversation(input) — find or start a conversation about a listing

Returns the existing conversation if one already exists between buyer and seller for the given listing, or creates a new one. Prevents a user from messaging themselves.

```ts
const conversation = await createOrGetConversation({
  listing_id: listing.id,
  buyer_id: session.user.id,
  seller_id: listing.user_id,
});
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `listing_id` | `string` | yes | UUID of the listing |
| `buyer_id` | `string` | yes | UUID of the user initiating the conversation |
| `seller_id` | `string` | yes | UUID of the listing owner; must differ from `buyer_id` |

**Returns:** `ConversationSummary`
**Throws:** if any ID is empty, or `buyer_id === seller_id`

---

## getConversationById(conversationId, userId) — fetch one conversation

Use to refresh a single conversation after sending a message or after a realtime event fires.

```ts
const conversation = await getConversationById(conversationId, session.user.id);
```

| Param | Type | Required |
|-------|------|----------|
| `conversationId` | `string` | yes |
| `userId` | `string` | yes — must be an active participant |

**Returns:** `ConversationSummary`
**Throws:** if the user is not a participant, or conversation is not found

---

## getConversations(userId) — list all conversations for a user

Returns all active conversations sorted by most recent activity (`updated_at` descending). Use for the inbox sidebar.

```ts
const conversations = await getConversations(session.user.id);
```

**Input:** `string` — UUID of the authenticated user
**Returns:** `ConversationSummary[]` — empty array if none
**Throws:** if `userId` is empty

---

## getMessages(conversationId, userId, options?) — fetch messages in a conversation

Returns messages in chronological order (oldest first). Supports cursor-based pagination for infinite scroll (load earlier messages).

```ts
// Initial load — 50 most recent messages
const messages = await getMessages(conversationId, session.user.id);

// Load earlier messages (infinite scroll going up)
const older = await getMessages(conversationId, session.user.id, {
  before: messages[0].created_at,
  limit: 30,
});
```

| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `conversationId` | `string` | yes | — | |
| `userId` | `string` | yes | — | must be an active participant |
| `options.limit` | `number` | no | `50` | max messages to return |
| `options.before` | `string` | no | — | ISO-8601 cursor; returns messages older than this timestamp |

**Returns:** `Message[]` — always in oldest-first order; empty array for a new conversation
**Throws:** if either ID is empty, or user is not a participant

---

## sendMessage(conversationId, senderId, content) — send a message

Sender must be an active participant. Also bumps `conversations.updated_at` so the inbox re-sorts correctly.

```ts
const message = await sendMessage(conversationId, session.user.id, "Is this still available?");
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `conversationId` | `string` | yes | |
| `senderId` | `string` | yes | must be an active participant |
| `content` | `string` | yes | 1–2000 characters |

**Returns:** `Message` — the newly created record
**Throws:** if any param is empty, content exceeds 2000 characters, or sender is not a participant

---

## markConversationAsRead(conversationId, userId) — mark messages as read

Marks all unread messages from the *other* participant as read. Call when the user opens a conversation.

```ts
await markConversationAsRead(conversationId, session.user.id);
```

| Param | Type | Required |
|-------|------|----------|
| `conversationId` | `string` | yes |
| `userId` | `string` | yes — must be an active participant |

**Returns:** `void`
**Throws:** if either ID is empty, or user is not a participant

---

## subscribeToConversations(userId, onUpdate) — realtime inbox updates

Listens for new messages across all of the user's conversations. Fires `onUpdate` with a refreshed `ConversationSummary` when a message arrives from another user. Use this to keep the inbox sidebar live. **Synchronous** — returns the cleanup function directly (no `await`).

```ts
const unsubscribe = subscribeToConversations(session.user.id, (updated) => {
  setConversations((prev) =>
    prev.map((c) => (c.id === updated.id ? updated : c))
  );
});

// On component unmount:
unsubscribe();
```

| Param | Type | Required |
|-------|------|----------|
| `userId` | `string` | yes |
| `onUpdate` | `(conversation: ConversationSummary) => void` | yes |

**Returns:** `() => void` — call to unsubscribe (e.g. in a `useEffect` cleanup)
**Throws:** if `userId` is empty

---

## subscribeToMessages(conversationId, userId, onMessage) — realtime messages in a conversation

Listens for new messages in a single conversation. **Async** — `await` it to ensure participant verification before the subscription opens. Use inside a message thread view.

```ts
const unsubscribe = await subscribeToMessages(
  conversationId,
  session.user.id,
  (message) => {
    setMessages((prev) => [...prev, message]);
  }
);

// On component unmount:
unsubscribe();
```

| Param | Type | Required |
|-------|------|----------|
| `conversationId` | `string` | yes |
| `userId` | `string` | yes — must be an active participant |
| `onMessage` | `(message: Message) => void` | yes |

**Returns:** `Promise<() => void>` — resolve to get the unsubscribe function
**Throws:** if either ID is empty, or user is not a participant

---

## Error Handling

All functions throw on failure. Wrap calls in `try/catch`:

```ts
try {
  const conversation = await createOrGetConversation({ listing_id, buyer_id, seller_id });
} catch (err) {
  console.error(err instanceof Error ? err.message : "Unknown error");
}
```

Common errors:
| Message | Cause |
|---------|-------|
| `"You are not a participant in this conversation"` | user is not in the conversation or has left |
| `"A user cannot start a conversation with themselves"` | `buyer_id === seller_id` |
| `"Message content cannot exceed 2000 characters"` | content too long |
| `"Message content cannot be empty"` | blank string passed to `sendMessage` |
| `"Conversation ID is required"` | empty string passed |

## Source

- `apps/backend/src/services/messaging.ts`
- `apps/backend/src/services/messaging.types.ts`
