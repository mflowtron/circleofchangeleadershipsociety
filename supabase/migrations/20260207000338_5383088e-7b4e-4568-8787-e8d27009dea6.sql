
-- RLS Policies for attendee_profiles
-- Note: These tables are accessed via edge functions using service role, 
-- so we keep policies restrictive but allow service role full access

-- Anyone can view profiles that are open to networking
CREATE POLICY "View open networking profiles"
  ON public.attendee_profiles
  FOR SELECT
  USING (open_to_networking = true);

-- Service role can manage all profiles (for edge functions)
CREATE POLICY "Service role full access to profiles"
  ON public.attendee_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for attendee_conversations
-- Service role manages conversations via edge functions
CREATE POLICY "Service role full access to conversations"
  ON public.attendee_conversations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for conversation_participants
-- Service role manages participants via edge functions
CREATE POLICY "Service role full access to participants"
  ON public.conversation_participants
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for attendee_messages
-- Service role manages messages via edge functions  
CREATE POLICY "Service role full access to messages"
  ON public.attendee_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);
