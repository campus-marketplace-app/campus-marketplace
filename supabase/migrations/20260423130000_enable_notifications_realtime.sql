-- Enable Supabase Realtime for the notifications table so clients can subscribe
-- to live INSERT events via subscribeToNotifications() in the backend service layer.
alter publication supabase_realtime add table public.notifications;
