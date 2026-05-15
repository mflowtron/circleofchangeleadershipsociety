import { useAnnouncements } from '@/hooks/useAnnouncements';
import AnnouncementCard from './AnnouncementCard';

export default function AnnouncementBanner() {
  const { allAnnouncements, loading } = useAnnouncements();

  if (loading || allAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {allAnnouncements.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
        />
      ))}
    </div>
  );
}
