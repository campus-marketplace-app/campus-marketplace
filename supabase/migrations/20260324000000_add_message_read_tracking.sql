-- Add read-tracking columns to messages so the inbox can display unread counts
-- and the service can mark messages as read.
alter table public.messages
  add column if not exists is_read boolean not null default false,
  add column if not exists read_at timestamptz;

-- Index for fast unread-count queries per conversation
create index if not exists idx_messages_is_read
  on public.messages(conversation_id, is_read)
  where is_read = false;
