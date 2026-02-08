import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAttendee } from '@/contexts/AttendeeContext';

export interface EventAnnouncement {
  id: string;
  event_id: string;
  title: string;
  content: string;
  priority: 'normal' | 'urgent';
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: string;
  push_notification_id: string | null;
  audience_type: string;
  audience_filter: Record<string, unknown> | null;
}

const DISMISSED_KEY = 'dismissed_event_announcements';

function getDismissedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveDismissedIds(ids: string[]): void {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
}

export function useEventAnnouncements() {
  const { selectedEvent } = useAttendee();
  const [announcements, setAnnouncements] = useState<EventAnnouncement[]>([]);
  const [allAnnouncements, setAllAnnouncements] = useState<EventAnnouncement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setDismissedIds(getDismissedIds());
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    if (!selectedEvent?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('event_id', selectedEvent.id)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cast the data to include new columns (TypeScript types may not be updated yet)
      const typedData = (data || []) as EventAnnouncement[];
      
      const currentDismissed = getDismissedIds();
      setAllAnnouncements(typedData);
      setAnnouncements(typedData.filter(a => !currentDismissed.includes(a.id)));
    } catch (err) {
      console.error('Error fetching event announcements:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedEvent?.id]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const dismissAnnouncement = useCallback((id: string) => {
    const newDismissedIds = [...dismissedIds, id];
    saveDismissedIds(newDismissedIds);
    setDismissedIds(newDismissedIds);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  }, [dismissedIds]);

  return {
    announcements,       // active, non-dismissed (for home screen)
    allAnnouncements,    // all active (for history view)
    loading,
    dismissAnnouncement,
    refetch: fetchAnnouncements,
  };
}
