-- Add secure token column to orders for guest access
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS edit_token uuid DEFAULT gen_random_uuid();

-- Create index on edit_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_orders_edit_token ON public.orders(edit_token);

-- Create attendees table
CREATE TABLE public.attendees (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  ticket_type_id uuid NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  attendee_name text,
  attendee_email text,
  additional_info jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_attendees_order_id ON public.attendees(order_id);
CREATE INDEX idx_attendees_order_item_id ON public.attendees(order_item_id);
CREATE INDEX idx_attendees_ticket_type_id ON public.attendees(ticket_type_id);

-- Enable RLS
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view attendees for their own orders or if they're admin/event owner
CREATE POLICY "Users can view attendees for own orders or as admin/organizer"
ON public.attendees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = attendees.order_id
    AND (
      o.user_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR is_event_owner(auth.uid(), o.event_id)
    )
  )
);

-- RLS: Users can update attendees for their own orders
CREATE POLICY "Users can update attendees for own orders"
ON public.attendees
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = attendees.order_id
    AND (
      o.user_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR is_event_owner(auth.uid(), o.event_id)
    )
  )
);

-- RLS: Allow insert via service role (edge functions)
CREATE POLICY "Service role can insert attendees"
ON public.attendees
FOR INSERT
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_attendees_updated_at
BEFORE UPDATE ON public.attendees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to verify order edit token (for guest access)
CREATE OR REPLACE FUNCTION public.verify_order_edit_token(_order_id uuid, _token uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = _order_id AND edit_token = _token
  )
$$;