-- Enable Supabase Realtime for the messages table so clients can subscribe
-- to live INSERT events via subscribeToMessages() in the backend service layer.
alter publication supabase_realtime add table public.messages;
