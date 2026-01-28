import { useEffect } from 'react';
import { format } from 'date-fns';
import { useOrderPortal } from '@/hooks/useOrderPortal';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Message {
  id: string;
  message: string;
  is_important: boolean;
  read_at: string | null;
  created_at: string;
}

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const { markMessageRead } = useOrderPortal();

  // Mark unread messages as read when they're viewed
  useEffect(() => {
    messages.forEach(msg => {
      if (!msg.read_at) {
        markMessageRead(msg.id);
      }
    });
  }, [messages, markMessageRead]);

  // Sort messages by date (newest first)
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-3">
      {sortedMessages.map((message) => (
        <div
          key={message.id}
          className={`
            rounded-lg p-3 border
            ${message.is_important 
              ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500' 
              : 'bg-muted border-transparent'
            }
            ${!message.read_at ? 'ring-2 ring-primary ring-offset-2' : ''}
          `}
        >
          <div className="flex items-start gap-2">
            {message.is_important && (
              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{format(new Date(message.created_at), 'MMM d, yyyy • h:mm a')}</span>
                {message.read_at && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Read
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {messages.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No messages from the organizer yet.
        </p>
      )}
    </div>
  );
}
