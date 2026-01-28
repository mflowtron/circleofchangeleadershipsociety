-- Create order_status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');

-- Create events table
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  short_description text,
  venue_name text,
  venue_address text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  cover_image_url text,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create ticket_types table
CREATE TABLE public.ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  quantity_available integer,
  quantity_sold integer NOT NULL DEFAULT 0,
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  max_per_order integer NOT NULL DEFAULT 10,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  user_id uuid,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  status order_status NOT NULL DEFAULT 'pending',
  subtotal_cents integer NOT NULL DEFAULT 0,
  fees_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Create order_items table
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  ticket_type_id uuid NOT NULL REFERENCES public.ticket_types(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL,
  attendee_name text,
  attendee_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_events_slug ON public.events(slug);
CREATE INDEX idx_events_starts_at ON public.events(starts_at);
CREATE INDEX idx_events_is_published ON public.events(is_published);
CREATE INDEX idx_ticket_types_event_id ON public.ticket_types(event_id);
CREATE INDEX idx_orders_event_id ON public.orders(event_id);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_email ON public.orders(email);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- Create updated_at trigger for events
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for ticket_types
CREATE TRIGGER update_ticket_types_updated_at
  BEFORE UPDATE ON public.ticket_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check if user can manage events
CREATE OR REPLACE FUNCTION public.can_manage_events(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'event_organizer')
  )
$$;

-- Create function to check if user owns event
CREATE OR REPLACE FUNCTION public.is_event_owner(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events
    WHERE id = _event_id
      AND created_by = _user_id
  )
$$;

-- Create function to generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number text;
  prefix text;
BEGIN
  prefix := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-';
  SELECT prefix || lpad(COALESCE(
    (SELECT COUNT(*) + 1 FROM public.orders WHERE order_number LIKE prefix || '%'),
    1
  )::text, 4, '0') INTO new_number;
  RETURN new_number;
END;
$$;

-- Enable RLS on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Events RLS Policies
CREATE POLICY "Published events are publicly visible"
  ON public.events
  FOR SELECT
  USING (is_published = true);

CREATE POLICY "Unpublished events visible to creator and admins"
  ON public.events
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Event organizers and admins can create events"
  ON public.events
  FOR INSERT
  WITH CHECK (can_manage_events(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Event creator and admins can update events"
  ON public.events
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Event creator and admins can delete events"
  ON public.events
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );

-- Ticket Types RLS Policies
CREATE POLICY "Ticket types visible with published events"
  ON public.ticket_types
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_types.event_id
      AND (e.is_published = true OR e.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Event owner and admins can create ticket types"
  ON public.ticket_types
  FOR INSERT
  WITH CHECK (
    is_event_owner(auth.uid(), event_id)
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Event owner and admins can update ticket types"
  ON public.ticket_types
  FOR UPDATE
  USING (
    is_event_owner(auth.uid(), event_id)
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Event owner and admins can delete ticket types"
  ON public.ticket_types
  FOR DELETE
  USING (
    is_event_owner(auth.uid(), event_id)
    OR has_role(auth.uid(), 'admin')
  );

-- Orders RLS Policies
CREATE POLICY "Users can view own orders"
  ON public.orders
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR is_event_owner(auth.uid(), event_id)
  );

CREATE POLICY "Anyone can create orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins and event owners can update orders"
  ON public.orders
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin')
    OR is_event_owner(auth.uid(), event_id)
  );

-- Order Items RLS Policies
CREATE POLICY "Users can view own order items"
  ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND (
        o.user_id = auth.uid()
        OR has_role(auth.uid(), 'admin')
        OR is_event_owner(auth.uid(), o.event_id)
      )
    )
  );

CREATE POLICY "Order items can be inserted with order"
  ON public.order_items
  FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for event images
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event images
CREATE POLICY "Event images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'event-images');

CREATE POLICY "Event organizers can upload event images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'event-images'
    AND can_manage_events(auth.uid())
  );

CREATE POLICY "Event organizers can update event images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'event-images'
    AND can_manage_events(auth.uid())
  );

CREATE POLICY "Event organizers can delete event images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'event-images'
    AND can_manage_events(auth.uid())
  );