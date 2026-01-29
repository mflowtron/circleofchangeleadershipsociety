import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, XCircle, User, Ticket, Hash, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AttendeeInfo {
  id: string;
  attendee_name: string | null;
  attendee_email: string | null;
  ticket_type?: { name: string } | null;
  order?: {
    order_number: string;
    full_name: string;
    email: string;
    event_id?: string;
  } | null;
}

interface CheckInResultProps {
  status: 'idle' | 'loading' | 'success' | 'already_checked_in' | 'error' | 'wrong_event';
  attendee: AttendeeInfo | null;
  existingCheckInTime?: string | null;
  errorMessage?: string;
  onCheckIn: () => void;
  onScanNext: () => void;
  onViewDetails?: () => void;
  isCheckingIn?: boolean;
}

export function CheckInResult({
  status,
  attendee,
  existingCheckInTime,
  errorMessage,
  onCheckIn,
  onScanNext,
  onViewDetails,
  isCheckingIn = false,
}: CheckInResultProps) {
  if (status === 'idle') {
    return null;
  }

  if (status === 'loading') {
    return (
      <Card className="p-8 text-center animate-pulse">
        <Loader2 className="h-12 w-12 text-muted-foreground mx-auto animate-spin mb-4" />
        <p className="text-muted-foreground">Looking up attendee...</p>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card className="p-8 text-center border-destructive/50 bg-destructive/5">
        <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-destructive mb-2">Error</h3>
        <p className="text-muted-foreground mb-6">{errorMessage || 'An error occurred'}</p>
        <Button onClick={onScanNext}>Scan Again</Button>
      </Card>
    );
  }

  if (status === 'wrong_event') {
    return (
      <Card className="p-8 text-center border-warning/50 bg-warning/5">
        <AlertTriangle className="h-16 w-16 text-warning mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Wrong Event</h3>
        <p className="text-muted-foreground mb-6">
          This attendee is registered for a different event.
        </p>
        <Button onClick={onScanNext}>Scan Different Code</Button>
      </Card>
    );
  }

  const displayName = attendee?.attendee_name || attendee?.order?.full_name || 'Unknown';
  const displayEmail = attendee?.attendee_email || attendee?.order?.email || '';
  const ticketType = attendee?.ticket_type?.name || 'General';
  const orderNumber = attendee?.order?.order_number || '';

  if (status === 'already_checked_in') {
    return (
      <Card className="p-8 text-center border-warning/50 bg-warning/5">
        <AlertTriangle className="h-16 w-16 text-warning mx-auto mb-4" />
        
        <h3 className="text-xl font-semibold mb-1">{displayName}</h3>
        <p className="text-muted-foreground text-sm mb-4">Already checked in today</p>
        
        {existingCheckInTime && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
            <Clock className="h-4 w-4" />
            <span>at {format(new Date(existingCheckInTime), 'h:mm a')}</span>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={onScanNext}>
            Scan Different
          </Button>
          {onViewDetails && (
            <Button variant="secondary" onClick={onViewDetails}>
              View Details
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (status === 'success') {
    return (
      <Card className="p-8 text-center border-green-500/50 bg-green-500/5">
        <div className="relative">
          <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-4 animate-in zoom-in-50 duration-300" />
        </div>
        
        <h3 className="text-2xl font-bold mb-1">{displayName}</h3>
        <p className="text-muted-foreground mb-4">{ticketType}</p>
        
        <div className="space-y-1 text-sm text-muted-foreground mb-6">
          {orderNumber && (
            <div className="flex items-center justify-center gap-2">
              <Hash className="h-4 w-4" />
              <span>{orderNumber}</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Checked in at {format(new Date(), 'h:mm a')}</span>
          </div>
        </div>

        <div className="text-2xl font-bold text-green-500 mb-6">
          ✓ CHECKED IN
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={onScanNext} className="bg-green-600 hover:bg-green-700">
            Scan Next
          </Button>
          {onViewDetails && (
            <Button variant="outline" onClick={onViewDetails}>
              View Details
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Default: show attendee info with check-in button
  return (
    <Card className="p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-primary" />
        </div>
        
        <h3 className="text-xl font-semibold mb-1">{displayName}</h3>
        {displayEmail && (
          <p className="text-muted-foreground text-sm">{displayEmail}</p>
        )}
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 text-sm">
          <Ticket className="h-4 w-4 text-muted-foreground" />
          <span>{ticketType}</span>
        </div>
        {orderNumber && (
          <div className="flex items-center gap-3 text-sm">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span>{orderNumber}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button 
          onClick={onCheckIn} 
          size="lg" 
          className="w-full"
          disabled={isCheckingIn}
        >
          {isCheckingIn ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Checking in...
            </>
          ) : (
            'Check In'
          )}
        </Button>
        <Button variant="outline" onClick={onScanNext}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
