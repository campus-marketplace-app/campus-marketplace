# Messaging — Usage Guide

> **Rule:** Never import `@supabase/supabase-js` in the frontend. Use `@campus-marketplace/backend`.

## Import

```ts
import {
  createConversation,
  getConversationsByUser,
  getConversation,
  getMessages,
  sendMessage,
  markMessagesRead,
  subscribeToMessages,
} from "@campus-marketplace/backend";
import type { Conversation, Message } from "@campus-marketplace/backend";
```

## Types

```ts
interface Conversation {
  id: string;                        // UUID
  listing_id: string | null;         // null if not tied to a listing
  created_at: string;                // ISO-8601
  updated_at: string;                // ISO-8601, updates when new message is sent
  other_user_id: string;             // the other person in the conversation
  other_user_display_name?: string;  // their display name (for showing in the list)
  last_message?: string;             // preview of the most recent message
  unread_count?: number;             // how many messages you haven't read yet
}

interface Message {
  id: string;              // UUID
  conversation_id: string; // which conversation this belongs to
  sender_id: string;       // who sent it
  content: string;         // the message text
  is_read: boolean;        // whether the recipient has read it
  read_at: string | null;  // when it was read, or null
  created_at: string;      // ISO-8601
}
```

---

## createConversation(userId, participantId, listingId?) — start or resume a chat

```ts
const conversation = await createConversation(myUserId, otherUserId, listingId);
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | `string` | yes | your user ID |
| `participantId` | `string` | yes | the other person's user ID |
| `listingId` | `string` | no | ties the conversation to a specific listing |

**Returns:** `Conversation` — if a conversation already exists for the same pair + listing, returns that one instead of creating a duplicate
**Throws:** if you try to message yourself, if either user ID is empty, or if the other user has blocked you

---

## getConversationsByUser(userId) — load the inbox / conversation list

```ts
const conversations = await getConversationsByUser(myUserId);
```

**Input:** `string` — your user ID
**Returns:** `Conversation[]` — sorted newest-first, includes display name, last message preview, and unread count. Empty array if no conversations.
**Throws:** if userId is empty

---

## getConversation(conversationId, userId) — load a single conversation

```ts
const conversation = await getConversation(conversationId, myUserId);
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `conversationId` | `string` | yes | which conversation to fetch |
| `userId` | `string` | yes | needed to figure out who "the other user" is |

**Returns:** `Conversation`
**Throws:** if the conversation doesn't exist

---

## getMessages(conversationId) — load the message thread

```ts
const messages = await getMessages(conversationId);
```

**Input:** `string` — the conversation ID
**Returns:** `Message[]` — sorted oldest-first (so newest messages are at the bottom). Empty array if no messages yet.
**Throws:** if the conversation doesn't exist

---

## sendMessage(conversationId, senderId, content) — send a message

```ts
const message = await sendMessage(conversationId, myUserId, "Hey, is this still available?");
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `conversationId` | `string` | yes | which conversation to send to |
| `senderId` | `string` | yes | your user ID |
| `content` | `string` | yes | the message text (cannot be empty) |

**Returns:** `Message` — the newly created message
**Throws:** if content is empty, if sender is not a participant in the conversation, or if the insert fails

---

## markMessagesRead(conversationId, userId) — clear the unread badge

```ts
await markMessagesRead(conversationId, myUserId);
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `conversationId` | `string` | yes | which conversation |
| `userId` | `string` | yes | your user ID |

**Returns:** nothing
**Throws:** if either param is empty. Does nothing if there are no unread messages (safe to call anytime).

---

## subscribeToMessages(conversationId, onMessage) — live updates via Supabase Realtime

```ts
// Start listening for new messages
const { unsubscribe } = subscribeToMessages(conversationId, (newMessage) => {
  // Add the new message to your local state
  setMessages((prev) => [...prev, newMessage]);
});

// When leaving the page or switching conversations, clean up:
unsubscribe();
```

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `conversationId` | `string` | yes | which conversation to listen to |
| `onMessage` | `(msg: Message) => void` | yes | called every time a new message arrives |

**Returns:** `{ unsubscribe: () => void }` — call `unsubscribe()` to stop listening
**Note:** This is NOT async — it returns immediately. The callback fires whenever a new message is inserted.

---

## Typical Page Flow

Here's how these functions work together on a messages page:

```ts
// 1. Load the conversation list for the sidebar
const conversations = await getConversationsByUser(myUserId);

// 2. When user clicks a conversation, load its messages
const messages = await getMessages(selectedConversationId);

// 3. Start listening for new messages in real time
const { unsubscribe } = subscribeToMessages(selectedConversationId, (msg) => {
  setMessages((prev) => [...prev, msg]);
});

// 4. Mark messages as read (clears the unread badge)
await markMessagesRead(selectedConversationId, myUserId);

// 5. When user sends a message
const sent = await sendMessage(selectedConversationId, myUserId, messageText);

// 6. When switching conversations or leaving the page
unsubscribe();
```

---

## Error Handling

All functions throw on failure. Wrap calls in `try/catch`:

```ts
try {
  const msg = await sendMessage(conversationId, myUserId, text);
} catch (err) {
  console.error(err instanceof Error ? err.message : "Unknown error");
}
```

## Source

- `apps/backend/src/services/messaging.ts`
