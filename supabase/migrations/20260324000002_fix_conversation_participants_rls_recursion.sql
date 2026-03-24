-- Fix infinite recursion in conversation_participants SELECT policy.
--
-- The original policy queried conversation_participants from within a policy
-- on conversation_participants, causing PostgreSQL to recurse infinitely.
--
-- Fix: introduce a SECURITY DEFINER helper function that reads
-- conversation_participants as the postgres superuser (bypassing RLS), then
-- rewrite all affected policies to call that function instead of doing a
-- self-referential subquery.

-- Helper: returns true if auth.uid() is an active participant in conv_id.
-- SECURITY DEFINER + set search_path ensures the inner query runs as postgres
-- (superuser), which bypasses RLS and breaks the recursive chain.
create or replace function public.current_user_is_participant(conv_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from conversation_participants
    where conversation_id = conv_id
      and user_id = auth.uid()
      and left_at is null
  );
$$;

-- Rebuild conversation_participants SELECT policy (was self-referential)
drop policy if exists "conversation_participants_select_in_conversation" on public.conversation_participants;
create policy "conversation_participants_select_in_conversation"
on public.conversation_participants
for select
to authenticated
using (public.current_user_is_participant(conversation_id));

-- Rebuild conversations SELECT policy (same pattern, also safe to update)
drop policy if exists "conversations_select_user_is_participant" on public.conversations;
create policy "conversations_select_user_is_participant"
on public.conversations
for select
to authenticated
using (public.current_user_is_participant(id));

-- Rebuild conversations UPDATE policy
drop policy if exists "conversations_update_participant" on public.conversations;
create policy "conversations_update_participant"
on public.conversations
for update
to authenticated
using (public.current_user_is_participant(id))
with check (public.current_user_is_participant(id));

-- Rebuild messages SELECT policy
drop policy if exists "messages_select_only_conversation_participants" on public.messages;
create policy "messages_select_only_conversation_participants"
on public.messages
for select
to authenticated
using (public.current_user_is_participant(conversation_id));

-- Rebuild messages INSERT policy
drop policy if exists "messages_insert_as_sender" on public.messages;
create policy "messages_insert_as_sender"
on public.messages
for insert
to authenticated
with check (
  auth.uid() is not null
  and auth.uid() = sender_id
  and public.current_user_is_participant(conversation_id)
);

-- Rebuild messages UPDATE policy
drop policy if exists "messages_update_participant_mark_read" on public.messages;
create policy "messages_update_participant_mark_read"
on public.messages
for update
to authenticated
using (public.current_user_is_participant(conversation_id))
with check (public.current_user_is_participant(conversation_id));
