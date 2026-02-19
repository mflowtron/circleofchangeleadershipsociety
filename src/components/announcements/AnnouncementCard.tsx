import { Megaphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LinkifiedText } from '@/utils/linkifyText';
import type { Announcement } from '@/hooks/useAnnouncements';

interface AnnouncementCardProps {
  announcement: Announcement;
  className?: string;
  onDismiss?: (id: string) => void;
}

export default function AnnouncementCard({
  announcement,
  className,
  onDismiss,
}: AnnouncementCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 shadow-gold animate-slide-in",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
      
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={() => onDismiss(announcement.id)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss announcement</span>
        </Button>
      )}
      
      <div className="relative flex items-start gap-3 pr-6">
        <div className="flex-shrink-0 p-2 rounded-xl bg-primary/20">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground leading-tight">
            {announcement.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            <LinkifiedText text={announcement.content} />
          </p>
        </div>
      </div>
    </div>
  );
}
