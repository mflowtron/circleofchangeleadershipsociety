import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAttendee } from '@/contexts/AttendeeContext';

export interface NetworkablePerson {
  id: string;
  type: 'attendee' | 'speaker';
  name: string;
  title?: string;
  company?: string;
  bio?: string;
  avatar_url?: string;
}

export function useNetworking() {
  const { email, sessionToken, selectedAttendee, selectedEvent } = useAttendee();
  const [speakers, setSpeakers] = useState<NetworkablePerson[]>([]);
  const [attendees, setAttendees] = useState<NetworkablePerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (searchQuery?: string) => {
    if (!email || !sessionToken || !selectedAttendee || !selectedEvent) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('get-networkable-attendees', {
        body: {
          email,
          session_token: sessionToken,
          attendee_id: selectedAttendee.id,
          event_id: selectedEvent.id,
          search: searchQuery
        }
      });

      if (fetchError) throw fetchError;
      if (data?.error) throw new Error(data.error);

      setSpeakers(data?.speakers || []);
      setAttendees(data?.attendees || []);
    } catch (err: any) {
      console.error('Failed to fetch networkable people:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [email, sessionToken, selectedAttendee, selectedEvent]);

  const createDM = useCallback(async (targetAttendeeId?: string, targetSpeakerId?: string) => {
    if (!email || !sessionToken || !selectedAttendee || !selectedEvent) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { data, error: createError } = await supabase.functions.invoke('create-dm-conversation', {
        body: {
          email,
          session_token: sessionToken,
          attendee_id: selectedAttendee.id,
          event_id: selectedEvent.id,
          target_attendee_id: targetAttendeeId,
          target_speaker_id: targetSpeakerId
        }
      });

      if (createError) throw createError;
      if (data?.error) throw new Error(data.error);

      return { 
        success: true, 
        conversationId: data.conversation_id,
        existing: data.existing 
      };
    } catch (err: any) {
      console.error('Failed to create DM:', err);
      return { success: false, error: err.message };
    }
  }, [email, sessionToken, selectedAttendee, selectedEvent]);

  return {
    speakers,
    attendees,
    loading,
    error,
    search,
    createDM
  };
}
