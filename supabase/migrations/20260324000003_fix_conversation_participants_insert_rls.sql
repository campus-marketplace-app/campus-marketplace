-- Fix conversation_participants INSERT policy.
--
-- The previous policy checked that the target conversation exists via a
-- subquery to public.conversations. However, conversations also has RLS
-- enabled, and the SELECT policy requires the user to already be a
-- participant — which is false during the insert that adds them as one.
-- The self-referential check caused a spurious "violates RLS" error.
--
-- Simplified policy: any authenticated user may insert participant rows.
-- Application-level validation in createOrGetConversation ensures only
-- valid conversation IDs and buyer/seller pairs are used.

drop policy if exists "conversation_participants_insert_authenticated" on public.conversation_participants;
create policy "conversation_participants_insert_authenticated"
on public.conversation_participants
for insert
to authenticated
with check (auth.uid() is not null);
