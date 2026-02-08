import { useEventAnnouncements } from '@/hooks/useEventAnnouncements';
import { Megaphone, Calendar } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function AttendeeAnnouncements() {
  const { allAnnouncements, loading } = useEventAnnouncements();

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Announcements</h1>
        <p className="text-sm text-muted-foreground">Updates from the event organizers</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : allAnnouncements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Megaphone className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium">No announcements yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Check back for updates from the organizers
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {allAnnouncements.map(announcement => (
            <Card
              key={announcement.id}
              className={cn(
                "overflow-hidden",
                announcement.priority === 'urgent'
                  ? "border-destructive/50 bg-destructive/5"
                  : "border-primary/30 bg-primary/5"
              )}
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div
                    className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                      announcement.priority === 'urgent'
                        ? "bg-destructive/10"
                        : "bg-primary/10"
                    )}
                  >
                    <Megaphone
                      className={cn(
                        "h-5 w-5",
                        announcement.priority === 'urgent'
                          ? "text-destructive"
                          : "text-primary"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{announcement.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(announcement.created_at), 'MMM d, yyyy h:mm a')}
                      <span>·</span>
                      {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
