import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useOrderPortal } from '@/hooks/useOrderPortal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle2, Send, Loader2, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  message: string;
  is_important: boolean;
  read_at: string | null;
  created_at: string;
  sender_type: 'organizer' | 'customer';
  sender_email: string | null;
}

interface MessageListProps {
  messages: Message[];
  orderId: string;
}

export function MessageList({ messages, orderId }: MessageListProps) {
  const { markMessageRead, sendMessage, loading } = useOrderPortal();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Mark unread organizer messages as read when they're viewed
  useEffect(() => {
    messages.forEach(msg => {
      if (!msg.read_at && msg.sender_type === 'organizer') {
        markMessageRead(msg.id);
      }
    });
  }, [messages, markMessageRead]);

  // Sort messages by date (oldest first for chat-like display)
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const result = await sendMessage(orderId, newMessage.trim());
    setSending(false);

    if (result.success) {
      setNewMessage('');
      toast.success('Message sent');
    } else {
      toast.error(result.message || 'Failed to send message');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-4">
      {/* Messages */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {sortedMessages.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">
            No messages yet. Send a message to the event organizer.
          </p>
        ) : (
          sortedMessages.map((message) => {
            const isCustomer = message.sender_type === 'customer';
            
            return (
              <div
                key={message.id}
                className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[80%] rounded-lg p-3 border
                    ${isCustomer 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : message.is_important 
                        ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500' 
                        : 'bg-muted border-transparent'
                    }
                    ${!message.read_at && !isCustomer ? 'ring-2 ring-primary ring-offset-2' : ''}
                  `}
                >
                  <div className="flex items-start gap-2">
                    {!isCustomer && message.is_important && (
                      <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className={`flex items-center gap-1 text-xs ${isCustomer ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {isCustomer ? (
                          <>
                            <User className="h-3 w-3" />
                            <span>You</span>
                          </>
                        ) : (
                          <>
                            <Building2 className="h-3 w-3" />
                            <span>Event Organizer</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      <div className={`flex items-center gap-2 text-xs ${isCustomer ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        <span>{format(new Date(message.created_at), 'MMM d • h:mm a')}</span>
                        {!isCustomer && message.read_at && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message Composer */}
      <div className="flex gap-2 pt-2 border-t">
        <Textarea
          placeholder="Type a message to the event organizer..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          className="min-h-[60px] resize-none"
          rows={2}
        />
        <Button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          size="icon"
          className="h-[60px] w-[60px] flex-shrink-0"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
