-- Add is_user_participant(conv_id, target_user_id) helper.
--
-- current_user_is_participant() only works when auth.uid() IS the user being
-- checked. verifyParticipant() in the service layer passes an explicit userId
-- that may not match auth.uid() (e.g. when the shared client has a different
-- user's session active). This SECURITY DEFINER function bypasses RLS and
-- checks participation for any user_id directly.

create or replace function public.is_user_participant(conv_id uuid, target_user_id uuid)
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
      and user_id = target_user_id
      and left_at is null
  );
$$;;