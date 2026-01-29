import { useAnnouncements } from '@/hooks/useAnnouncements';
import AnnouncementCard from './AnnouncementCard';

export default function AnnouncementBanner() {
  const { announcements, loading } = useAnnouncements();

  if (loading || announcements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {announcements.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
        />
      ))}
    </div>
  );
}
