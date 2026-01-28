-- Add columns to support two-way messaging
ALTER TABLE public.order_messages 
ADD COLUMN sender_type text NOT NULL DEFAULT 'organizer' CHECK (sender_type IN ('organizer', 'customer')),
ADD COLUMN sender_email text;

-- Make created_by nullable for customer messages (they don't have auth accounts)
ALTER TABLE public.order_messages 
ALTER COLUMN created_by DROP NOT NULL;

-- Update RLS policy to allow service role inserts for customer messages
-- First drop the existing insert policy
DROP POLICY IF EXISTS "Admins and event organizers can insert messages" ON public.order_messages;

-- Create new insert policy that allows service role
CREATE POLICY "Authorized users can insert messages"
ON public.order_messages
FOR INSERT
WITH CHECK (
  -- Organizers/admins creating messages (sender_type = 'organizer')
  (sender_type = 'organizer' AND created_by = auth.uid() AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_messages.order_id AND is_event_owner(auth.uid(), o.event_id))
  ))
  -- Customer messages are inserted via service role (handled in edge function)
  OR sender_type = 'customer'
);

-- Add policy for customers to view their own messages (via edge function with service role)
-- The existing select policy only allows admins/organizers, we'll handle customer access via edge function