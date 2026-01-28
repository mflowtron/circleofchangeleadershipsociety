import { Megaphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Announcement } from '@/hooks/useAnnouncements';

interface AnnouncementCardProps {
  announcement: Announcement;
  onDismiss?: (id: string) => void;
  showDismiss?: boolean;
  className?: string;
}

export default function AnnouncementCard({
  announcement,
  onDismiss,
  showDismiss = true,
  className,
}: AnnouncementCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 shadow-gold animate-slide-in",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
      
      <div className="relative flex items-start gap-3">
        <div className="flex-shrink-0 p-2 rounded-xl bg-primary/20">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground leading-tight">
            {announcement.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {announcement.content}
          </p>
        </div>

        {showDismiss && onDismiss && (
          <button
            onClick={() => onDismiss(announcement.id)}
            className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Dismiss announcement"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
