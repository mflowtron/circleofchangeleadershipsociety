-- Add onesignal_player_id column to profiles table
ALTER TABLE public.profiles
ADD COLUMN onesignal_player_id text;

-- Create push notifications table for history tracking
CREATE TABLE public.push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  redirect_url text,
  audience_type text NOT NULL DEFAULT 'all',
  audience_filter jsonb,
  recipient_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Organizers can read push notifications for events they manage
CREATE POLICY "Organizers can read push notifications"
  ON public.push_notifications FOR SELECT
  USING (
    is_admin(auth.uid()) OR 
    is_event_owner(auth.uid(), event_id) OR
    can_manage_events(auth.uid())
  );

-- Policy: Organizers can create push notifications
CREATE POLICY "Organizers can create push notifications"
  ON public.push_notifications FOR INSERT
  WITH CHECK (
    is_admin(auth.uid()) OR 
    is_event_owner(auth.uid(), event_id) OR
    can_manage_events(auth.uid())
  );

-- Create index for faster lookups
CREATE INDEX idx_push_notifications_event_id ON public.push_notifications(event_id);
CREATE INDEX idx_push_notifications_created_at ON public.push_notifications(created_at DESC);
CREATE INDEX idx_profiles_onesignal_player_id ON public.profiles(onesignal_player_id) WHERE onesignal_player_id IS NOT NULL;