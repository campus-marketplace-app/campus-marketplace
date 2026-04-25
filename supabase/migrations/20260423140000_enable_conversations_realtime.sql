-- Enable Supabase Realtime for the conversations table so clients can subscribe
-- to live UPDATE events via subscribeToConversations() in the backend service layer.
alter publication supabase_realtime add table public.conversations;
