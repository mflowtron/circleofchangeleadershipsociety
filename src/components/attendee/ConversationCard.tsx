import { memo, useCallback, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Users, Calendar, Radio, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Conversation } from '@/hooks/useConversations';
import { useAttendee } from '@/contexts/AttendeeContext';

interface ConversationCardProps {
  conversation: Conversation;
  onClick: () => void;
}

export const ConversationCard = memo(function ConversationCard({ conversation, onClick }: ConversationCardProps) {
  const { prefetchMessages } = useAttendee();
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Prefetch messages on hover/focus (debounced)
  const handleMouseEnter = useCallback(() => {
    prefetchTimeoutRef.current = setTimeout(() => {
      prefetchMessages(conversation.id);
    }, 300);
  }, [prefetchMessages, conversation.id]);

  const handleMouseLeave = useCallback(() => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }
  }, []);

  const getIcon = () => {
    switch (conversation.type) {
      case 'event':
        return <Radio className="h-5 w-5 text-primary" />;
      case 'session':
        return <Calendar className="h-5 w-5 text-primary" />;
      case 'group':
        return <Users className="h-5 w-5 text-primary" />;
      default:
        return null;
    }
  };

  const getName = () => {
    if (conversation.type === 'direct' && conversation.other_participant) {
      return conversation.other_participant.name;
    }
    return conversation.name || 'Conversation';
  };

  const getAvatar = () => {
    if (conversation.type === 'direct' && conversation.other_participant) {
      const initials = conversation.other_participant.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      return (
        <Avatar className="h-12 w-12">
          <AvatarImage src={conversation.other_participant.avatar_url} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      );
    }

    const icon = getIcon();
    if (icon) {
      return (
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      );
    }

    return (
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
        <MessageCircle className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  };

  const getPreview = () => {
    if (!conversation.last_message) {
      return 'No messages yet';
    }
    
    const content = conversation.last_message.content;
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  };

  const getTime = () => {
    if (!conversation.last_message) return null;
    
    return formatDistanceToNow(new Date(conversation.last_message.created_at), { 
      addSuffix: false 
    });
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      className={cn(
        "w-full flex items-center gap-3 p-4 text-left transition-all duration-200",
        "hover:bg-accent/50 active:bg-accent active:scale-[0.99]",
        "border-b border-border last:border-b-0 group"
      )}
    >
      {getAvatar()}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn(
            "font-medium truncate",
            conversation.unread_count > 0 && "font-semibold"
          )}>
            {getName()}
          </h3>
          {getTime() && (
            <span className="text-xs text-muted-foreground shrink-0">
              {getTime()}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn(
            "text-sm truncate",
            conversation.unread_count > 0 
              ? "text-foreground" 
              : "text-muted-foreground"
          )}>
            {getPreview()}
          </p>
          
          {conversation.unread_count > 0 && (
            <Badge variant="default" className="h-5 min-w-[20px] px-1.5 text-xs shrink-0">
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </Badge>
          )}
        </div>

        {conversation.type !== 'direct' && conversation.participant_count > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {conversation.participant_count} {conversation.participant_count === 1 ? 'member' : 'members'}
          </p>
        )}
      </div>
      
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
});
