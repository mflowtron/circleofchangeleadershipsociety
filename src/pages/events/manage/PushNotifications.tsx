import { Bell, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { NotificationComposer } from '@/components/events/push/NotificationComposer';
import { NotificationHistory } from '@/components/events/push/NotificationHistory';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useEventSelection } from '@/contexts/EventSelectionContext';

export default function PushNotifications() {
  const { selectedEventId, hasSelection } = useEventSelection();
  const { notifications, isLoading, isSending, isCancelling, sendNotification, cancelNotification } = usePushNotifications(selectedEventId);

  if (!hasSelection) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Push Notifications</h1>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Event Selected</AlertTitle>
          <AlertDescription>
            Please select an event from the sidebar to send push notifications.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Push Notifications</h1>
      </div>

      <Alert>
        <Bell className="h-4 w-4" />
        <AlertTitle>Natively + OneSignal Integration</AlertTitle>
        <AlertDescription>
          Push notifications are sent to attendees who have the native app installed and notifications enabled.
          Messages are delivered instantly or at your scheduled time.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <NotificationComposer
            eventId={selectedEventId!}
            onSend={sendNotification}
            isSending={isSending}
          />
        </div>
        <div>
          <NotificationHistory
            notifications={notifications}
            isLoading={isLoading}
            onCancel={cancelNotification}
            isCancelling={isCancelling}
          />
        </div>
      </div>
    </div>
  );
}
