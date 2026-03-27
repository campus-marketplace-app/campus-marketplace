-- Add missing RLS policies for the messaging service.
-- The existing migration (20260318000001) added SELECT policies only.
-- These additions cover INSERT and UPDATE paths used by the frontend (anon key).

-- CONVERSATIONS: allow authenticated users to create conversations
drop policy if exists "conversations_insert_authenticated" on public.conversations;
create policy "conversations_insert_authenticated"
on public.conversations
for insert
to authenticated
with check (auth.uid() is not null);

-- CONVERSATIONS: allow participants to touch updated_at when a message is sent
-- (sendMessage does a fire-and-forget UPDATE to re-sort the inbox)
drop policy if exists "conversations_update_participant" on public.conversations;
create policy "conversations_update_participant"
on public.conversations
for update
to authenticated
using (
  exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = conversations.id
      and cp.user_id = auth.uid()
      and cp.left_at is null
  )
)
with check (
  exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = conversations.id
      and cp.user_id = auth.uid()
      and cp.left_at is null
  )
);

-- CONVERSATION_PARTICIPANTS: allow authenticated users to add participants to
-- existing conversations. Application-level validation in createOrGetConversation
-- ensures only valid buyer/seller pairs are inserted.
drop policy if exists "conversation_participants_insert_authenticated" on public.conversation_participants;
create policy "conversation_participants_insert_authenticated"
on public.conversation_participants
for insert
to authenticated
with check (
  auth.uid() is not null
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and c.deleted_at is null
  )
);

-- MESSAGES: allow conversation participants to update messages
-- (used by markConversationAsRead to set is_read = true and read_at)
drop policy if exists "messages_update_participant_mark_read" on public.messages;
create policy "messages_update_participant_mark_read"
on public.messages
for update
to authenticated
using (
  exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = auth.uid()
      and cp.left_at is null
  )
)
with check (
  exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = auth.uid()
      and cp.left_at is null
  )
);;