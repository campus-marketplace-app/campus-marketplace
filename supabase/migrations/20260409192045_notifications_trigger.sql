-- Auto-create notifications when a message is sent.
-- The trigger function runs as postgres (SECURITY DEFINER) so it can insert
-- notifications for the recipient without needing INSERT permission on notifications.

create or replace function public.notify_new_message()
returns trigger language plpgsql security definer as $$
declare
  recipient_id uuid;
begin
  -- Find the recipient of this message (the other participant in the conversation).
  select user_id into recipient_id
  from public.conversation_participants
  where conversation_id = NEW.conversation_id
    and user_id != NEW.sender_id
    and left_at is null
  limit 1;

  -- If there is a recipient, insert a new_message notification.
  if recipient_id is not null then
    insert into public.notifications (user_id, type, payload)
    values (
      recipient_id,
      'new_message',
      jsonb_build_object(
        'message_id', NEW.id,
        'conversation_id', NEW.conversation_id,
        'sender_id', NEW.sender_id,
        'preview', left(NEW.content, 100)
      )
    );
  end if;

  return NEW;
end;
$$;

-- Create the trigger that fires after a message is inserted.
create trigger on_message_insert
  after insert on public.messages
  for each row execute function public.notify_new_message();
