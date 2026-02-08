-- Add scheduling columns to push_notifications table
ALTER TABLE public.push_notifications
ADD COLUMN scheduled_for timestamptz,
ADD COLUMN sent_at timestamptz;

COMMENT ON COLUMN public.push_notifications.scheduled_for IS 
  'When the notification should be sent. NULL = sent immediately.';
COMMENT ON COLUMN public.push_notifications.sent_at IS 
  'When the notification was actually sent. NULL = not yet sent.';