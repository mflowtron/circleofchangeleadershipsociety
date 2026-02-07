import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAttendeeAuth } from './AttendeeAuthContext';
import { useAttendeeEvent } from './AttendeeEventContext';

export interface Bookmark {
  id: string;
  attendee_id: string;
  agenda_item_id: string;
  created_at: string;
}

interface BookmarksContextType {
  bookmarks: Bookmark[];
  bookmarkedItemIds: Set<string>;
  toggleBookmark: (agendaItemId: string) => Promise<{ success: boolean }>;
  refreshBookmarks: () => Promise<void>;
  loading: boolean;
}

const BookmarksContext = createContext<BookmarksContextType | undefined>(undefined);

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAttendeeAuth();
  const { selectedAttendee } = useAttendeeEvent();

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch bookmarks
  const refreshBookmarks = useCallback(async () => {
    if (!isAuthenticated || !selectedAttendee) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-attendee-bookmarks', {
        body: {
          attendee_id: selectedAttendee.id,
        },
      });

      if (!error && data?.bookmarks) {
        setBookmarks(data.bookmarks);
      }
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedAttendee]);

  // Toggle bookmark
  const toggleBookmark = useCallback(async (agendaItemId: string) => {
    if (!isAuthenticated || !selectedAttendee) {
      return { success: false };
    }

    // Optimistic update
    const isCurrentlyBookmarked = bookmarks.some(b => b.agenda_item_id === agendaItemId);

    if (isCurrentlyBookmarked) {
      setBookmarks(prev => prev.filter(b => b.agenda_item_id !== agendaItemId));
    } else {
      setBookmarks(prev => [...prev, {
        id: `temp-${Date.now()}`,
        attendee_id: selectedAttendee.id,
        agenda_item_id: agendaItemId,
        created_at: new Date().toISOString(),
      }]);
    }

    try {
      const { data, error } = await supabase.functions.invoke('toggle-attendee-bookmark', {
        body: {
          attendee_id: selectedAttendee.id,
          agenda_item_id: agendaItemId,
        },
      });

      if (error || !data?.success) {
        // Revert optimistic update on error
        await refreshBookmarks();
        return { success: false };
      }

      // Success - trust the optimistic update, no refresh needed
      return { success: true };
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
      await refreshBookmarks();
      return { success: false };
    }
  }, [isAuthenticated, selectedAttendee, bookmarks, refreshBookmarks]);

  // Bookmarked item IDs set for quick lookup
  const bookmarkedItemIds = useMemo(() => {
    return new Set(bookmarks.map(b => b.agenda_item_id));
  }, [bookmarks]);

  // Fetch bookmarks when attendee changes
  useEffect(() => {
    if (selectedAttendee && isAuthenticated) {
      refreshBookmarks();
    }
  }, [selectedAttendee?.id, isAuthenticated]);

  const value: BookmarksContextType = {
    bookmarks,
    bookmarkedItemIds,
    toggleBookmark,
    refreshBookmarks,
    loading,
  };

  return (
    <BookmarksContext.Provider value={value}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks() {
  const context = useContext(BookmarksContext);
  if (context === undefined) {
    throw new Error('useBookmarks must be used within a BookmarksProvider');
  }
  return context;
}
