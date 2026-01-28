-- Create badge_templates table
CREATE TABLE public.badge_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  background_image_url TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);

-- Enable RLS
ALTER TABLE public.badge_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies: Only admins and event organizers can manage badge templates
CREATE POLICY "Users can view badge templates for events they can manage"
ON public.badge_templates
FOR SELECT
TO authenticated
USING (public.can_manage_events(auth.uid()));

CREATE POLICY "Users can create badge templates for events they can manage"
ON public.badge_templates
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_events(auth.uid()));

CREATE POLICY "Users can update badge templates for events they can manage"
ON public.badge_templates
FOR UPDATE
TO authenticated
USING (public.can_manage_events(auth.uid()));

CREATE POLICY "Users can delete badge templates for events they can manage"
ON public.badge_templates
FOR DELETE
TO authenticated
USING (public.can_manage_events(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_badge_templates_updated_at
BEFORE UPDATE ON public.badge_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create badge-templates storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('badge-templates', 'badge-templates', true);

-- Storage policies for badge-templates bucket
CREATE POLICY "Authenticated users can view badge templates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'badge-templates');

CREATE POLICY "Event managers can upload badge templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'badge-templates' AND public.can_manage_events(auth.uid()));

CREATE POLICY "Event managers can update badge templates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'badge-templates' AND public.can_manage_events(auth.uid()));

CREATE POLICY "Event managers can delete badge templates"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'badge-templates' AND public.can_manage_events(auth.uid()));