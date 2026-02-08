-- ============================================================================
-- REGISTRATION FLOW: New table + column additions
-- Supports the public conference registration & ticket purchase flow
-- ============================================================================

-- 1. Create registrations table (thin metadata layer linking to orders)
CREATE TABLE IF NOT EXISTS public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id),
  pricing_tier text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registrations_order_id ON public.registrations(order_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.registrations(event_id);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Service role handles all access via edge functions
CREATE POLICY "registrations_service_role_all"
  ON public.registrations FOR ALL
  USING (true) WITH CHECK (true);

-- 2. Add registration-specific columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS organization_name text,
  ADD COLUMN IF NOT EXISTS referral_source text;

-- 3. Add form-tracking and purchaser columns to attendees
ALTER TABLE public.attendees
  ADD COLUMN IF NOT EXISTS is_purchaser boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS form_status text DEFAULT 'needs_info',
  ADD COLUMN IF NOT EXISTS tally_form_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS tally_form_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS qr_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

CREATE INDEX IF NOT EXISTS idx_attendees_qr_token ON public.attendees(qr_token);
