import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAttendee } from '@/contexts/AttendeeContext';

export interface AttendeeProfile {
  attendee_id: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  company?: string;
  title?: string;
  open_to_networking: boolean;
}

export function useAttendeeProfile() {
  const { isAuthenticated, selectedAttendee } = useAttendee();
  const [profile, setProfile] = useState<AttendeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated || !selectedAttendee) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('get-attendee-profile', {
        body: {
          attendee_id: selectedAttendee.id
        }
      });

      if (fetchError) throw fetchError;
      if (data?.error) throw new Error(data.error);

      setProfile(data?.profile || {
        attendee_id: selectedAttendee.id,
        display_name: selectedAttendee.attendee_name,
        open_to_networking: false
      });
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedAttendee]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<AttendeeProfile>) => {
    if (!isAuthenticated || !selectedAttendee) {
      return { success: false, error: 'Not authenticated' };
    }

    setUpdating(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase.functions.invoke('update-attendee-profile', {
        body: {
          attendee_id: selectedAttendee.id,
          ...updates
        }
      });

      if (updateError) throw updateError;
      if (data?.error) throw new Error(data.error);

      setProfile(data?.profile);
      return { success: true };
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setUpdating(false);
    }
  }, [isAuthenticated, selectedAttendee]);

  return {
    profile,
    loading,
    updating,
    error,
    updateProfile,
    refetch: fetchProfile
  };
}
