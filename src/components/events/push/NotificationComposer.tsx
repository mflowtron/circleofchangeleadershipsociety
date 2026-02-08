import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Send, Loader2, AlertTriangle } from 'lucide-react';
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

interface NotificationComposerProps {
  eventId: string;
  onSend: (data: {
    title: string;
    message: string;
    redirect_url?: string;
    audience_type: AudienceType;
    audience_filter?: AudienceFilter;
  }) => Promise<void>;
  isSending: boolean;
}

const MAX_TITLE_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 200;

export function NotificationComposer({ eventId, onSend, isSending }: NotificationComposerProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [audienceType, setAudienceType] = useState<AudienceType>('all');
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data: audienceCounts } = useAudienceCounts(eventId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setShowConfirmDialog(true);
  };

  const handleConfirm = async () => {
    await onSend({
      title: title.trim(),
      message: message.trim(),
      redirect_url: redirectUrl.trim() || undefined,
      audience_type: audienceType,
      audience_filter: Object.keys(audienceFilter).length > 0 ? audienceFilter : undefined,
    });

    // Reset form and close dialog
    setShowConfirmDialog(false);
    setTitle('');
    setMessage('');
    setRedirectUrl('');
    setAudienceType('all');
    setAudienceFilter({});
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

  const isValid = title.trim().length > 0 && message.trim().length > 0;

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
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Notification
            </>
          )}
        </Button>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Send Push Notification?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You are about to send a notification to{' '}
                  <span className="font-medium">{getRecipientCount()}</span> attendees.
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
                </div>
                
                <p className="text-xs text-muted-foreground">
                  This action cannot be undone. Notifications will be sent immediately to all targeted devices.
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
                  Sending...
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
