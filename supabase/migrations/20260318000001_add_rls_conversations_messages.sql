-- CM-US-015 RLS for conversations and messages


-- Enable RLS on conversations, conversation_participants, and messages tables
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
-- CONVERSATIONS
-- users can only read conversations they actively participate in
drop policy if exists "conversations_select_user_is_participant" on public.conversations;
create policy "conversations_select_user_is_participant"
on public.conversations
for select
to authenticated
using (
    exists (
        select 1
        from public.conversation_participants cp
        where cp.conversation_id = conversations.id
          and cp.user_id = auth.uid()
          and cp.left_at is null
    )
);
-- CONVERSATION_PARTICIPANTS
-- users can read participant rows only for conversations they are in
drop policy if exists "conversation_participants_select_in_conversation" on public.conversation_participants;
create policy "conversation_participants_select_in_conversation"
on public.conversation_participants
for select
to authenticated
using (
    exists (
        select 1
        from public.conversation_participants cp
        where cp.conversation_id = conversation_participants.conversation_id
          and cp.user_id = auth.uid()
          and cp.left_at is null
    )
);
-- users can update only their own participant row
-- intended mainly for leaving a conversation by setting left_at
drop policy if exists "conversation_participants_update_own" on public.conversation_participants;
create policy "conversation_participants_update_own"
on public.conversation_participants
for update
to authenticated
using (
    auth.uid() is not null
    and auth.uid() = user_id
)
with check (
    auth.uid() is not null
    and auth.uid() = user_id
);
-- MESSAGES
-- users can only read messages from conversations they actively participate in
drop policy if exists "messages_select_only_conversation_participants" on public.messages;
create policy "messages_select_only_conversation_participants"
on public.messages
for select
to authenticated
using (
    exists (
        select 1
        from public.conversation_participants cp
        where cp.conversation_id = messages.conversation_id
          and cp.user_id = auth.uid()
          and cp.left_at is null
    )
);
-- users can only send messages in conversations they actively participate in
-- sender_id must match auth.uid()
drop policy if exists "messages_insert_as_sender" on public.messages;
create policy "messages_insert_as_sender"
on public.messages
for insert
to authenticated
with check (
    auth.uid() is not null
    and auth.uid() = sender_id
    and exists (
        select 1
        from public.conversation_participants cp
        where cp.conversation_id = messages.conversation_id
          and cp.user_id = auth.uid()
          and cp.left_at is null
    )
);