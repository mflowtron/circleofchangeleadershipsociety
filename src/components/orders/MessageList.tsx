import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useOrderPortal } from '@/hooks/useOrderPortal';
import { AlertTriangle, CheckCircle2, Send, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Message {
  id: string;
  message: string;
  is_important: boolean;
  read_at: string | null;
  created_at: string;
  sender_type?: string;
}

interface MessageListProps {
  messages: Message[];
  orderId: string;
  onSendMessage: (orderId: string, message: string) => Promise<{ success: boolean; message?: string }>;
}

export function MessageList({ messages, orderId, onSendMessage }: MessageListProps) {
  const { markMessageRead } = useOrderPortal();
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // Mark unread organizer messages as read when they're viewed
  useEffect(() => {
    messages.forEach(msg => {
      if (!msg.read_at && msg.sender_type !== 'customer') {
        markMessageRead(msg.id);
      }
    });
  }, [messages, markMessageRead]);

  // Sort messages by date (newest first)
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleSendReply = async () => {
    if (!replyText.trim()) return;

    setSending(true);
    const result = await onSendMessage(orderId, replyText.trim());
    setSending(false);

    if (result.success) {
      setReplyText('');
      toast.success('Message sent');
    } else {
      toast.error(result.message || 'Failed to send message');
    }
  };

  return (
    <div className="space-y-4">
      {/* Reply Form */}
      <div className="space-y-2">
        <Textarea
          placeholder="Write a message to the organizer..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          rows={2}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSendReply}
            disabled={!replyText.trim() || sending}
          >
            <Send className="h-4 w-4 mr-1" />
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {sortedMessages.map((message) => {
          const isCustomer = message.sender_type === 'customer';
          
          return (
            <div
              key={message.id}
              className={`
                rounded-lg p-3 border
                ${message.is_important 
                  ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500' 
                  : isCustomer
                    ? 'bg-primary/5 border-primary/20 ml-4'
                    : 'bg-muted border-transparent mr-4'
                }
                ${!message.read_at && !isCustomer ? 'ring-2 ring-primary ring-offset-2' : ''}
              `}
            >
              <div className="flex items-start gap-2">
                {message.is_important ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                ) : isCustomer ? (
                  <User className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {isCustomer ? 'You' : 'Organizer'}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{format(new Date(message.created_at), 'MMM d, yyyy • h:mm a')}</span>
                    {message.read_at && !isCustomer && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Read
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground italic text-center py-2">
            No messages yet. Send a message to the organizer above.
          </p>
        )}
      </div>
    </div>
  );
}
