import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Users, Home, Monitor, Tag, User, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { type PushNotification } from '@/hooks/usePushNotifications';

interface NotificationHistoryProps {
  notifications: PushNotification[];
  isLoading: boolean;
}

const audienceTypeLabels: Record<string, { label: string; icon: React.ElementType }> = {
  all: { label: 'All Attendees', icon: Users },
  in_person: { label: 'In-Person', icon: Home },
  virtual: { label: 'Virtual', icon: Monitor },
  ticket_type: { label: 'By Ticket Type', icon: Tag },
  individual: { label: 'Individual', icon: User },
};

export function NotificationHistory({ notifications, isLoading }: NotificationHistoryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Notification History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Notification History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No notifications sent yet</p>
            <p className="text-sm">Compose your first push notification above</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Notification History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications.map((notification) => {
          const audienceInfo = audienceTypeLabels[notification.audience_type] || audienceTypeLabels.all;
          const AudienceIcon = audienceInfo.icon;
          const isSent = notification.status === 'sent';

          return (
            <div
              key={notification.id}
              className="border rounded-lg p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium">{notification.title}</h4>
                <Badge variant={isSent ? 'default' : 'destructive'} className="shrink-0">
                  {isSent ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Sent</>
                  ) : (
                    <><XCircle className="h-3 w-3 mr-1" /> Failed</>
                  )}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2">
                {notification.message}
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <AudienceIcon className="h-3 w-3" />
                  {audienceInfo.label}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {notification.recipient_count} recipients
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </span>
              </div>

              {notification.error_message && (
                <p className="text-xs text-destructive mt-2">
                  Error: {notification.error_message}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
