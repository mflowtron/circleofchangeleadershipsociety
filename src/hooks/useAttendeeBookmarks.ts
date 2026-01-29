import { useAttendee } from '@/contexts/AttendeeContext';

export function useAttendeeBookmarks() {
  const { 
    bookmarks, 
    bookmarkedItemIds, 
    toggleBookmark, 
    refreshBookmarks,
    loading 
  } = useAttendee();

  const isBookmarked = (agendaItemId: string) => {
    return bookmarkedItemIds.has(agendaItemId);
  };

  return {
    bookmarks,
    bookmarkedItemIds,
    isBookmarked,
    toggleBookmark,
    refreshBookmarks,
    loading,
  };
}
