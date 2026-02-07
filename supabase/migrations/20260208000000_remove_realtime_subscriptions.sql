-- Remove all tables from realtime publication
-- Realtime has been replaced with polling throughout the application

DO $$
DECLARE
  _tbl text;
  _tables text[] := ARRAY[
    'recordings',
    'recording_resources',
    'order_messages',
    'profiles',
    'attendee_checkins',
    'attendee_messages',
    'conversation_participants',
    'message_reactions'
  ];
BEGIN
  FOREACH _tbl IN ARRAY _tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = _tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', _tbl);
    END IF;
  END LOOP;
END $$;
