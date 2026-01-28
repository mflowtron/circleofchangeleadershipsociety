-- Create order_access_codes table for OTP authentication
CREATE TABLE public.order_access_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_order_access_codes_email ON public.order_access_codes(email);
CREATE INDEX idx_order_access_codes_code ON public.order_access_codes(code);

-- Enable RLS but restrict all access (only service role via edge functions)
ALTER TABLE public.order_access_codes ENABLE ROW LEVEL SECURITY;

-- No RLS policies = only service role can access

-- Create order_messages table for admin communication
CREATE TABLE public.order_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_important BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_order_messages_order_id ON public.order_messages(order_id);

-- Enable RLS
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- Admins and event organizers can insert messages
CREATE POLICY "Admins and event organizers can insert messages"
ON public.order_messages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND is_event_owner(auth.uid(), o.event_id)
  )
);

-- Admins and event organizers can view all messages for their events
CREATE POLICY "Admins and event organizers can view messages"
ON public.order_messages
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND is_event_owner(auth.uid(), o.event_id)
  )
);

-- Message author can update their own messages
CREATE POLICY "Message author can update own messages"
ON public.order_messages
FOR UPDATE
USING (created_by = auth.uid());

-- Admins can delete messages
CREATE POLICY "Admins can delete messages"
ON public.order_messages
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));