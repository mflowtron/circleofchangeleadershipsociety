-- Create speakers table
CREATE TABLE public.speakers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  company text,
  bio text,
  photo_url text,
  linkedin_url text,
  twitter_url text,
  website_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create agenda_items table
CREATE TABLE public.agenda_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  item_type text NOT NULL DEFAULT 'session',
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone,
  location text,
  track text,
  sort_order integer NOT NULL DEFAULT 0,
  is_highlighted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create agenda_item_speakers junction table
CREATE TABLE public.agenda_item_speakers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agenda_item_id uuid NOT NULL REFERENCES public.agenda_items(id) ON DELETE CASCADE,
  speaker_id uuid NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'speaker',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(agenda_item_id, speaker_id)
);

-- Create indexes for performance
CREATE INDEX idx_speakers_event_id ON public.speakers(event_id);
CREATE INDEX idx_speakers_sort_order ON public.speakers(sort_order);
CREATE INDEX idx_agenda_items_event_id ON public.agenda_items(event_id);
CREATE INDEX idx_agenda_items_starts_at ON public.agenda_items(starts_at);
CREATE INDEX idx_agenda_items_sort_order ON public.agenda_items(sort_order);
CREATE INDEX idx_agenda_item_speakers_agenda_item_id ON public.agenda_item_speakers(agenda_item_id);
CREATE INDEX idx_agenda_item_speakers_speaker_id ON public.agenda_item_speakers(speaker_id);

-- Enable RLS on all tables
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_item_speakers ENABLE ROW LEVEL SECURITY;

-- Speakers RLS policies (same pattern as ticket_types)
CREATE POLICY "Speakers visible with published events"
  ON public.speakers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = speakers.event_id
      AND (e.is_published = true OR e.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Event owner and admins can create speakers"
  ON public.speakers FOR INSERT
  WITH CHECK (
    is_event_owner(auth.uid(), event_id) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Event owner and admins can update speakers"
  ON public.speakers FOR UPDATE
  USING (
    is_event_owner(auth.uid(), event_id) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Event owner and admins can delete speakers"
  ON public.speakers FOR DELETE
  USING (
    is_event_owner(auth.uid(), event_id) OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Agenda items RLS policies
CREATE POLICY "Agenda items visible with published events"
  ON public.agenda_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = agenda_items.event_id
      AND (e.is_published = true OR e.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Event owner and admins can create agenda items"
  ON public.agenda_items FOR INSERT
  WITH CHECK (
    is_event_owner(auth.uid(), event_id) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Event owner and admins can update agenda items"
  ON public.agenda_items FOR UPDATE
  USING (
    is_event_owner(auth.uid(), event_id) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Event owner and admins can delete agenda items"
  ON public.agenda_items FOR DELETE
  USING (
    is_event_owner(auth.uid(), event_id) OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Agenda item speakers RLS policies
CREATE POLICY "Agenda item speakers visible with agenda item"
  ON public.agenda_item_speakers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agenda_items ai
      JOIN public.events e ON e.id = ai.event_id
      WHERE ai.id = agenda_item_speakers.agenda_item_id
      AND (e.is_published = true OR e.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Event owner and admins can manage agenda item speakers"
  ON public.agenda_item_speakers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agenda_items ai
      WHERE ai.id = agenda_item_speakers.agenda_item_id
      AND (is_event_owner(auth.uid(), ai.event_id) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Event owner and admins can update agenda item speakers"
  ON public.agenda_item_speakers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.agenda_items ai
      WHERE ai.id = agenda_item_speakers.agenda_item_id
      AND (is_event_owner(auth.uid(), ai.event_id) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Event owner and admins can delete agenda item speakers"
  ON public.agenda_item_speakers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.agenda_items ai
      WHERE ai.id = agenda_item_speakers.agenda_item_id
      AND (is_event_owner(auth.uid(), ai.event_id) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_speakers_updated_at
  BEFORE UPDATE ON public.speakers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agenda_items_updated_at
  BEFORE UPDATE ON public.agenda_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();