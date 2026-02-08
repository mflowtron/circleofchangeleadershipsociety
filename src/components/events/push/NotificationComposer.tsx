import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Loader2, AlertTriangle, CalendarIcon, Clock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AudienceSelector } from './AudienceSelector';
import { type AudienceType, type AudienceFilter, useAudienceCounts } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';
import { format, addMinutes, setHours, setMinutes, isBefore, addDays } from 'date-fns';

interface NotificationComposerProps {
  eventId: string;
  onSend: (data: {
    title: string;
    message: string;
    redirect_url?: string;
    audience_type: AudienceType;
    audience_filter?: AudienceFilter;
    scheduled_for?: string;
  }) => Promise<void>;
  isSending: boolean;
}

const MAX_TITLE_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 200;

type DeliveryMode = 'now' | 'scheduled';

export function NotificationComposer({ eventId, onSend, isSending }: NotificationComposerProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [audienceType, setAudienceType] = useState<AudienceType>('all');
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Scheduling state
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('now');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState('09:00');

  const { data: audienceCounts } = useAudienceCounts(eventId);

  const getScheduledDateTime = (): Date | null => {
    if (!scheduledDate) return null;
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    return setMinutes(setHours(scheduledDate, hours), minutes);
  };

  const isScheduleValid = (): boolean => {
    if (deliveryMode === 'now') return true;
    const scheduledDateTime = getScheduledDateTime();
    if (!scheduledDateTime) return false;
    const minTime = addMinutes(new Date(), 5);
    const maxTime = addDays(new Date(), 30);
    return !isBefore(scheduledDateTime, minTime) && isBefore(scheduledDateTime, maxTime);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    if (!isScheduleValid()) return;
    setShowConfirmDialog(true);
  };

  const handleConfirm = async () => {
    const scheduledDateTime = deliveryMode === 'scheduled' ? getScheduledDateTime() : null;
    
    await onSend({
      title: title.trim(),
      message: message.trim(),
      redirect_url: redirectUrl.trim() || undefined,
      audience_type: audienceType,
      audience_filter: Object.keys(audienceFilter).length > 0 ? audienceFilter : undefined,
      scheduled_for: scheduledDateTime?.toISOString(),
    });

    // Reset form and close dialog
    setShowConfirmDialog(false);
    setTitle('');
    setMessage('');
    setRedirectUrl('');
    setAudienceType('all');
    setAudienceFilter({});
    setDeliveryMode('now');
    setScheduledDate(undefined);
    setScheduledTime('09:00');
  };

  const getAudienceLabel = () => {
    switch (audienceType) {
      case 'all': return 'All Attendees';
      case 'in_person': return 'In-Person Only';
      case 'virtual': return 'Virtual Only';
      case 'ticket_type': return 'By Ticket Type';
      case 'individual': return 'Individual Attendees';
      default: return audienceType;
    }
  };

  const getRecipientCount = () => {
    if (!audienceCounts) return 0;

    switch (audienceType) {
      case 'all':
        return audienceCounts.total;
      case 'in_person':
        return audienceCounts.inPerson;
      case 'virtual':
        return audienceCounts.virtual;
      case 'ticket_type':
        if (!audienceFilter.ticket_type_ids?.length) return 0;
        return audienceCounts.ticketTypes
          .filter(t => audienceFilter.ticket_type_ids?.includes(t.id))
          .reduce((sum, t) => sum + t.count, 0);
      case 'individual':
        return audienceFilter.attendee_ids?.length || 0;
      default:
        return 0;
    }
  };

  const isValid = title.trim().length > 0 && message.trim().length > 0 && isScheduleValid();
  const scheduledDateTime = getScheduledDateTime();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Compose Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter notification title..."
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
              disabled={isSending}
            />
            <p className="text-xs text-muted-foreground text-right">
              {title.length}/{MAX_TITLE_LENGTH} chars
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Enter notification message..."
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              rows={3}
              disabled={isSending}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/{MAX_MESSAGE_LENGTH} chars
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="redirect">Redirect URL (optional)</Label>
            <Input
              id="redirect"
              placeholder="/attendee/app/agenda/session-123"
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              disabled={isSending}
            />
            <p className="text-xs text-muted-foreground">
              Where to navigate when the user taps the notification
            </p>
          </div>
        </CardContent>
      </Card>

      <AudienceSelector
        eventId={eventId}
        audienceType={audienceType}
        audienceFilter={audienceFilter}
        onAudienceTypeChange={setAudienceType}
        onAudienceFilterChange={setAudienceFilter}
        audienceCounts={audienceCounts}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Delivery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={deliveryMode}
            onValueChange={(v) => setDeliveryMode(v as DeliveryMode)}
            disabled={isSending}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="now" id="delivery-now" />
              <Label htmlFor="delivery-now" className="font-normal cursor-pointer">
                Send Now
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="scheduled" id="delivery-scheduled" />
              <Label htmlFor="delivery-scheduled" className="font-normal cursor-pointer">
                Schedule for Later
              </Label>
            </div>
          </RadioGroup>

          {deliveryMode === 'scheduled' && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap gap-3">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-[200px] justify-start text-left font-normal',
                          !scheduledDate && 'text-muted-foreground'
                        )}
                        disabled={isSending}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, 'MMM d, yyyy') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        disabled={(date) => isBefore(date, new Date()) || isBefore(addDays(new Date(), 30), date)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduled-time">Time</Label>
                  <Input
                    id="scheduled-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-[140px]"
                    disabled={isSending}
                  />
                </div>
              </div>

              {scheduledDate && !isScheduleValid() && (
                <p className="text-sm text-destructive">
                  Schedule must be at least 5 minutes in the future and within 30 days.
                </p>
              )}

              {scheduledDate && isScheduleValid() && scheduledDateTime && (
                <p className="text-sm text-muted-foreground">
                  Will be sent on{' '}
                  <span className="font-medium">
                    {format(scheduledDateTime, "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Will be sent to <span className="font-medium">{getRecipientCount()}</span> attendees
          <br />
          <span className="text-xs">(Only those with notifications enabled)</span>
        </p>
        <Button
          type="submit"
          disabled={!isValid || isSending}
          className="min-w-[160px]"
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {deliveryMode === 'scheduled' ? 'Scheduling...' : 'Sending...'}
            </>
          ) : (
            <>
              {deliveryMode === 'scheduled' ? (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Schedule Notification
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Notification
                </>
              )}
            </>
          )}
        </Button>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {deliveryMode === 'scheduled' ? 'Schedule Push Notification?' : 'Send Push Notification?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  {deliveryMode === 'scheduled' && scheduledDateTime ? (
                    <>
                      This notification will be sent to{' '}
                      <span className="font-medium">{getRecipientCount()}</span> attendees on{' '}
                      <span className="font-medium">{format(scheduledDateTime, "MMM d, yyyy 'at' h:mm a")}</span>.
                    </>
                  ) : (
                    <>
                      You are about to send a notification to{' '}
                      <span className="font-medium">{getRecipientCount()}</span> attendees.
                    </>
                  )}
                </p>
                
                <div className="rounded-md border bg-muted/50 p-3 space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Title:</span> {title}
                  </div>
                  <div>
                    <span className="font-medium">Message:</span>{' '}
                    {message.length > 100 ? `${message.slice(0, 100)}...` : message}
                  </div>
                  <div>
                    <span className="font-medium">Audience:</span> {getAudienceLabel()}
                  </div>
                  {deliveryMode === 'scheduled' && scheduledDateTime && (
                    <div>
                      <span className="font-medium">Scheduled:</span>{' '}
                      {format(scheduledDateTime, "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {deliveryMode === 'scheduled'
                    ? 'You can cancel this notification before the scheduled time from the history below.'
                    : 'This action cannot be undone. Notifications will be sent immediately to all targeted devices.'}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {deliveryMode === 'scheduled' ? 'Scheduling...' : 'Sending...'}
                </>
              ) : deliveryMode === 'scheduled' ? (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Schedule Notification
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Notification
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
