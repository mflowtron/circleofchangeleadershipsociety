-- ============================================================
-- SPEAKERS: Split into public + admin policies
-- ============================================================
DROP POLICY IF EXISTS "Speakers with published events" ON public.speakers;

CREATE POLICY "Speakers with published events"
  ON public.speakers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = speakers.event_id
      AND e.is_published = true
    )
  );

CREATE POLICY "Speakers for unpublished events"
  ON public.speakers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = speakers.event_id
      AND (e.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- ============================================================
-- TICKET_TYPES: Split into public + admin policies
-- ============================================================
DROP POLICY IF EXISTS "Ticket types with published events" ON public.ticket_types;

CREATE POLICY "Ticket types with published events"
  ON public.ticket_types
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_types.event_id
      AND e.is_published = true
    )
  );

CREATE POLICY "Ticket types for unpublished events"
  ON public.ticket_types
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_types.event_id
      AND (e.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- ============================================================
-- AGENDA_ITEMS: Split into public + admin policies
-- ============================================================
DROP POLICY IF EXISTS "Agenda with published events" ON public.agenda_items;

CREATE POLICY "Agenda with published events"
  ON public.agenda_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = agenda_items.event_id
      AND e.is_published = true
    )
  );

CREATE POLICY "Agenda for unpublished events"
  ON public.agenda_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = agenda_items.event_id
      AND (e.created_by = auth.uid() OR public.is_admin(auth.uid()))
    )
  );