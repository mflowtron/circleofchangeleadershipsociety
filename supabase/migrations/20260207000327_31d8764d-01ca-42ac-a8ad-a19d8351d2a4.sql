
-- Create attendee_profiles table for networking settings
CREATE TABLE public.attendee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id UUID NOT NULL REFERENCES public.attendees(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  company TEXT,
  title TEXT,
  open_to_networking BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(attendee_id)
);

-- Create attendee_conversations table
CREATE TABLE public.attendee_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'session', 'event')),
  name TEXT,
  description TEXT,
  agenda_item_id UUID REFERENCES public.agenda_items(id) ON DELETE SET NULL,
  created_by_attendee_id UUID REFERENCES public.attendees(id) ON DELETE SET NULL,
  created_by_speaker_id UUID REFERENCES public.speakers(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create conversation_participants table
CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.attendee_conversations(id) ON DELETE CASCADE,
  attendee_id UUID REFERENCES public.attendees(id) ON DELETE CASCADE,
  speaker_id UUID REFERENCES public.speakers(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  muted_until TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, attendee_id),
  UNIQUE(conversation_id, speaker_id),
  CHECK (
    (attendee_id IS NOT NULL AND speaker_id IS NULL) OR
    (attendee_id IS NULL AND speaker_id IS NOT NULL)
  )
);

-- Create attendee_messages table
CREATE TABLE public.attendee_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.attendee_conversations(id) ON DELETE CASCADE,
  sender_attendee_id UUID REFERENCES public.attendees(id) ON DELETE SET NULL,
  sender_speaker_id UUID REFERENCES public.speakers(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  reply_to_id UUID REFERENCES public.attendee_messages(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (
    (sender_attendee_id IS NOT NULL AND sender_speaker_id IS NULL) OR
    (sender_attendee_id IS NULL AND sender_speaker_id IS NOT NULL)
  )
);

-- Create indexes for better query performance
CREATE INDEX idx_attendee_profiles_attendee_id ON public.attendee_profiles(attendee_id);
CREATE INDEX idx_attendee_profiles_open_networking ON public.attendee_profiles(open_to_networking) WHERE open_to_networking = true;
CREATE INDEX idx_attendee_conversations_event_id ON public.attendee_conversations(event_id);
CREATE INDEX idx_attendee_conversations_type ON public.attendee_conversations(type);
CREATE INDEX idx_attendee_conversations_agenda_item ON public.attendee_conversations(agenda_item_id) WHERE agenda_item_id IS NOT NULL;
CREATE INDEX idx_conversation_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_attendee ON public.conversation_participants(attendee_id) WHERE attendee_id IS NOT NULL;
CREATE INDEX idx_conversation_participants_speaker ON public.conversation_participants(speaker_id) WHERE speaker_id IS NOT NULL;
CREATE INDEX idx_attendee_messages_conversation ON public.attendee_messages(conversation_id);
CREATE INDEX idx_attendee_messages_created_at ON public.attendee_messages(conversation_id, created_at DESC);

-- Enable RLS on all tables
ALTER TABLE public.attendee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendee_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendee_messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime for messages and participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendee_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;

-- Create trigger for updated_at on attendee_profiles
CREATE TRIGGER update_attendee_profiles_updated_at
  BEFORE UPDATE ON public.attendee_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on attendee_conversations
CREATE TRIGGER update_attendee_conversations_updated_at
  BEFORE UPDATE ON public.attendee_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on attendee_messages
CREATE TRIGGER update_attendee_messages_updated_at
  BEFORE UPDATE ON public.attendee_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
