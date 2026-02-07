-- Create message_reactions table
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.attendee_messages(id) ON DELETE CASCADE,
  attendee_id uuid REFERENCES public.attendees(id) ON DELETE CASCADE,
  speaker_id uuid REFERENCES public.speakers(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  -- Only one reaction type per person per message
  CONSTRAINT unique_attendee_reaction UNIQUE (message_id, attendee_id, emoji),
  CONSTRAINT unique_speaker_reaction UNIQUE (message_id, speaker_id, emoji),
  
  -- Must have either attendee or speaker
  CONSTRAINT sender_check CHECK (
    (attendee_id IS NOT NULL AND speaker_id IS NULL) OR
    (attendee_id IS NULL AND speaker_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_message_reactions_message ON public.message_reactions(message_id);
CREATE INDEX idx_message_reactions_message_emoji ON public.message_reactions(message_id, emoji);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;