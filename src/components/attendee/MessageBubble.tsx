import { memo } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Message } from '@/hooks/useMessages';

interface MessageBubbleProps {
  message: Message;
  showSender?: boolean;
}

export const MessageBubble = memo(function MessageBubble({ message, showSender = true }: MessageBubbleProps) {
  const initials = message.sender.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const time = format(new Date(message.created_at), 'h:mm a');
  const isSending = message.status === 'sending';
  const isFailed = message.status === 'failed';

  if (message.is_own) {
    return (
      <div className={cn(
        "flex justify-end mb-3 transition-opacity duration-200",
        isSending && "opacity-70"
      )}>
        <div className="max-w-[80%]">
          {message.reply_to && (
            <div className="bg-muted/50 rounded-t-lg px-3 py-2 text-xs border-l-2 border-primary mb-1">
              <span className="font-medium">{message.reply_to.sender_name}</span>
              <p className="text-muted-foreground truncate">{message.reply_to.content}</p>
            </div>
          )}
          <div className={cn(
            "bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2",
            isFailed && "bg-destructive"
          )}>
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          </div>
          <div className="flex items-center justify-end gap-1 mt-1">
            {isSending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Sending...</span>
              </>
            ) : isFailed ? (
              <span className="text-xs text-destructive">Failed to send</span>
            ) : (
              <p className="text-xs text-muted-foreground">{time}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 mb-3">
      {showSender && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={message.sender.avatar_url} />
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}
      {!showSender && <div className="w-8" />}
      
      <div className="max-w-[80%]">
        {showSender && (
          <p className="text-xs font-medium text-foreground mb-1">
            {message.sender.name}
            {message.sender.type === 'speaker' && (
              <span className="ml-1 text-primary">(Speaker)</span>
            )}
          </p>
        )}
        
        {message.reply_to && (
          <div className="bg-muted/50 rounded-t-lg px-3 py-2 text-xs border-l-2 border-muted-foreground mb-1">
            <span className="font-medium">{message.reply_to.sender_name}</span>
            <p className="text-muted-foreground truncate">{message.reply_to.content}</p>
          </div>
        )}
        
        <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-2">
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{time}</p>
      </div>
    </div>
  );
});
