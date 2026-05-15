import { useState, useEffect, useCallback, useRef } from 'react';
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
  view_count: number;
  dismiss_count: number;
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
  const { selectedEvent, selectedAttendee } = useAttendee();
  const [announcements, setAnnouncements] = useState<EventAnnouncement[]>([]);
  const [allAnnouncements, setAllAnnouncements] = useState<EventAnnouncement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track which announcements have been viewed this session to prevent duplicate API calls
  const trackedViews = useRef(new Set<string>());

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

  // Track view analytics
  const trackView = useCallback(async (announcementId: string) => {
    // Prevent duplicate tracking within the same session
    if (trackedViews.current.has(announcementId)) return;
    if (!selectedAttendee?.id) return;
    
    trackedViews.current.add(announcementId);
    
    try {
      await supabase.from('announcement_analytics').upsert(
        {
          announcement_id: announcementId,
          attendee_id: selectedAttendee.id,
          event_type: 'view',
        },
        { 
          onConflict: 'announcement_id,attendee_id,event_type',
          ignoreDuplicates: true 
        }
      );
    } catch (err) {
      // Silently fail - analytics shouldn't break the user experience
      console.error('Failed to track announcement view:', err);
    }
  }, [selectedAttendee?.id]);

  // Track dismiss analytics
  const trackDismiss = useCallback(async (announcementId: string) => {
    if (!selectedAttendee?.id) return;
    
    try {
      await supabase.from('announcement_analytics').upsert(
        {
          announcement_id: announcementId,
          attendee_id: selectedAttendee.id,
          event_type: 'dismiss',
        },
        { 
          onConflict: 'announcement_id,attendee_id,event_type',
          ignoreDuplicates: true 
        }
      );
    } catch (err) {
      console.error('Failed to track announcement dismiss:', err);
    }
  }, [selectedAttendee?.id]);

  const dismissAnnouncement = useCallback((id: string) => {
    const newDismissedIds = [...dismissedIds, id];
    saveDismissedIds(newDismissedIds);
    setDismissedIds(newDismissedIds);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    
    // Also track the dismissal for analytics
    trackDismiss(id);
  }, [dismissedIds, trackDismiss]);

  return {
    announcements,       // active, non-dismissed (for home screen)
    allAnnouncements,    // all active (for history view)
    loading,
    dismissAnnouncement,
    trackView,
    refetch: fetchAnnouncements,
  };
}
