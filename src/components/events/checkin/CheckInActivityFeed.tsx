import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Undo2, Loader2 } from 'lucide-react';
import { useEventCheckins, useUndoCheckIn, type CheckIn } from '@/hooks/useCheckins';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useState } from 'react';

interface CheckInActivityFeedProps {
  eventId: string;
  date?: string;
  limit?: number;
}

export function CheckInActivityFeed({ eventId, date = format(new Date(), 'yyyy-MM-dd'), limit = 10 }: CheckInActivityFeedProps) {
  const { data: checkins = [], isLoading } = useEventCheckins(eventId, date);
  const undoCheckIn = useUndoCheckIn();
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const displayedCheckins = limit ? checkins.slice(0, limit) : checkins;

  const handleUndo = async (checkin: CheckIn) => {
    setUndoingId(checkin.id);
    try {
      await undoCheckIn.mutateAsync({
        checkinId: checkin.id,
        eventId: checkin.event_id,
        attendeeId: checkin.attendee_id,
      });
      toast.success('Check-in undone');
    } catch (error) {
      toast.error('Failed to undo check-in');
    } finally {
      setUndoingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (checkins.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No check-ins yet today</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {displayedCheckins.map((checkin) => {
        const attendee = checkin.attendee;
        const displayName = attendee?.attendee_name || attendee?.order?.full_name || 'Unknown';
        const ticketType = attendee?.ticket_type?.name;
        const isUndoing = undoingId === checkin.id;

        return (
          <Card key={checkin.id} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">{displayName}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{format(new Date(checkin.checked_in_at), 'h:mm a')}</span>
                  {ticketType && (
                    <>
                      <span>•</span>
                      <Badge variant="secondary" className="text-xs">
                        {ticketType}
                      </Badge>
                    </>
                  )}
                  {checkin.notes && (
                    <>
                      <span>•</span>
                      <span className="text-xs italic">{checkin.notes}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUndo(checkin)}
              disabled={isUndoing}
              className="text-muted-foreground hover:text-destructive"
            >
              {isUndoing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Undo2 className="h-4 w-4" />
              )}
            </Button>
          </Card>
        );
      })}
      
      {checkins.length > limit && (
        <p className="text-center text-sm text-muted-foreground pt-2">
          +{checkins.length - limit} more check-ins
        </p>
      )}
    </div>
  );
}
