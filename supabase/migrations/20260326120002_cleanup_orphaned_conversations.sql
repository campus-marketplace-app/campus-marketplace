-- Remove orphaned conversations that have no participants.
-- These were created during early testing (2026-03-24) and are unreachable
-- by any messaging query since conversation_participants has 0 matching rows.

delete from public.conversations
where id not in (
  select distinct conversation_id from public.conversation_participants
);
