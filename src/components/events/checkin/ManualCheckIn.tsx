import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, User, Mail, Hash, CheckCircle2, Loader2 } from 'lucide-react';
import { useEventAttendees, type Attendee } from '@/hooks/useAttendees';
import { useEventCheckins, useCheckIn } from '@/hooks/useCheckins';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ManualCheckInProps {
  eventId: string;
  date?: string;
  onCheckInComplete?: () => void;
}

export function ManualCheckIn({ eventId, date = format(new Date(), 'yyyy-MM-dd'), onCheckInComplete }: ManualCheckInProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  
  const { data: attendees = [], isLoading: loadingAttendees } = useEventAttendees(eventId);
  const { data: checkins = [] } = useEventCheckins(eventId, date);
  const checkIn = useCheckIn();

  const checkedInIds = useMemo(() => {
    return new Set(checkins.map(c => c.attendee_id));
  }, [checkins]);

  // Filter to only in-person attendees (exclude virtual)
  const inPersonAttendees = useMemo(() => {
    return attendees.filter(a => !a.ticket_type?.is_virtual);
  }, [attendees]);

  const filteredAttendees = useMemo(() => {
    if (!searchQuery.trim()) return inPersonAttendees;
    
    const query = searchQuery.toLowerCase();
    return inPersonAttendees.filter(attendee => {
      const name = (attendee.attendee_name || attendee.order?.full_name || '').toLowerCase();
      const email = (attendee.attendee_email || attendee.order?.email || '').toLowerCase();
      const orderNumber = (attendee.order?.order_number || '').toLowerCase();
      
      return name.includes(query) || email.includes(query) || orderNumber.includes(query);
    });
  }, [inPersonAttendees, searchQuery]);

  const handleCheckIn = async (attendee: Attendee) => {
    if (checkedInIds.has(attendee.id)) {
      toast.info('Already checked in today');
      return;
    }

    setCheckingInId(attendee.id);
    try {
      await checkIn.mutateAsync({
        attendeeId: attendee.id,
        eventId,
        date,
        notes: 'Manual check-in',
      });
      toast.success(`${attendee.attendee_name || attendee.order?.full_name || 'Attendee'} checked in!`);
      onCheckInComplete?.();
    } catch (error: any) {
      if (error.message === 'Already checked in for today') {
        toast.info('Already checked in today');
      } else {
        toast.error('Failed to check in');
      }
    } finally {
      setCheckingInId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or order number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loadingAttendees ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredAttendees.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? 'No attendees found matching your search' : 'No attendees for this event'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredAttendees.map((attendee) => {
            const isCheckedIn = checkedInIds.has(attendee.id);
            const isChecking = checkingInId === attendee.id;
            
            return (
              <Card
                key={attendee.id}
                className={`p-4 flex items-center justify-between gap-4 ${
                  isCheckedIn ? 'bg-green-500/5 border-green-500/30' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">
                      {attendee.attendee_name || attendee.order?.full_name || 'Unknown'}
                    </span>
                    {isCheckedIn && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {attendee.attendee_email || attendee.order?.email || 'No email'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {attendee.ticket_type?.name || 'Ticket'}
                    </Badge>
                    {attendee.order?.order_number && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {attendee.order.order_number}
                      </span>
                    )}
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant={isCheckedIn ? 'outline' : 'default'}
                  onClick={() => handleCheckIn(attendee)}
                  disabled={isCheckedIn || isChecking}
                  className={isCheckedIn ? 'text-green-600' : ''}
                >
                  {isChecking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCheckedIn ? (
                    'Checked In'
                  ) : (
                    'Check In'
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
