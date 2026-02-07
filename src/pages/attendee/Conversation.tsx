import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Users, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMessages } from '@/hooks/useMessages';
import { useConversations, Conversation } from '@/hooks/useConversations';
import { MessageBubble } from '@/components/attendee/MessageBubble';
import { MessageInput } from '@/components/attendee/MessageInput';
import { useToast } from '@/hooks/use-toast';

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const { conversations, loading: convsLoading } = useConversations();
  const { messages, loading, sending, hasMore, sendMessage, sendMessageWithAttachment, loadMore, toggleReaction, getReactors } = useMessages(conversationId || null);
  
  const [conversation, setConversation] = useState<Conversation | null>(null);

  // Find current conversation
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationId);
      setConversation(conv || null);
    }
  }, [conversationId, conversations]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && !loading) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, loading]);

  const handleSend = async (content: string) => {
    const result = await sendMessage(content);
    if (!result.success) {
      toast({
        title: 'Failed to send',
        description: result.error || 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const handleSendWithAttachment = async (content: string, file: File) => {
    const result = await sendMessageWithAttachment(content, file);
    if (!result.success) {
      toast({
        title: 'Failed to send',
        description: result.error || 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    const result = await toggleReaction(messageId, emoji);
    if (!result.success) {
      toast({
        title: 'Failed to react',
        description: result.error || 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const getTitle = () => {
    if (!conversation) return 'Loading...';
    
    if (conversation.type === 'direct' && conversation.other_participant) {
      return conversation.other_participant.name;
    }
    
    return conversation.name || 'Conversation';
  };

  const getSubtitle = () => {
    if (!conversation) return null;
    
    if (conversation.type === 'direct' && conversation.other_participant?.type === 'speaker') {
      return 'Speaker';
    }
    
    if (conversation.type !== 'direct' && conversation.participant_count > 0) {
      return `${conversation.participant_count} members`;
    }
    
    return null;
  };

  // Group messages by sender for consecutive messages
  const shouldShowSender = (index: number) => {
    if (index === 0) return true;
    const current = messages[index];
    const previous = messages[index - 1];
    
    if (current.is_own !== previous.is_own) return true;
    if (current.sender.id !== previous.sender.id) return true;
    
    // Show sender if more than 5 minutes apart
    const currentTime = new Date(current.created_at).getTime();
    const previousTime = new Date(previous.created_at).getTime();
    if (currentTime - previousTime > 5 * 60 * 1000) return true;
    
    return false;
  };

  if (convsLoading && !conversation) {
    return (
      <div className="flex flex-col h-[100dvh] bg-background">
        <div 
          className="flex items-center gap-3 p-4 border-b border-border shrink-0"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <Skeleton className="h-12 w-48 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background motion-safe:animate-slide-in-from-right">
      {/* Header with safe area */}
      <div 
        className="flex items-center gap-3 px-4 pb-3 border-b border-border bg-background shrink-0"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <Button
          size="icon"
          variant="ghost"
          onClick={() => navigate('/attendee/app/messages')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{getTitle()}</h1>
          {getSubtitle() && (
            <p className="text-xs text-muted-foreground">{getSubtitle()}</p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {conversation?.type !== 'direct' && (
              <DropdownMenuItem>
                <Users className="h-4 w-4 mr-2" />
                View Members
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <Info className="h-4 w-4 mr-2" />
              Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages - flex-col-reverse for bottom anchoring */}
      <div 
        className="flex-1 overflow-y-auto flex flex-col-reverse"
        style={{ WebkitOverflowScrolling: 'touch' }}
        ref={scrollAreaRef}
      >
        <div className="flex flex-col p-4">
          {/* Load more button */}
          {hasMore && (
            <div className="flex justify-center mb-4">
              <Button variant="ghost" size="sm" onClick={loadMore}>
                Load earlier messages
              </Button>
            </div>
          )}

          {loading && messages.length === 0 ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  <Skeleton className="h-12 w-48 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center flex-1">
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Send a message to start the conversation
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                showSender={shouldShowSender(index)}
                onReaction={handleReaction}
                onFetchReactors={getReactors}
              />
            ))
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input with safe area */}
      <div className="shrink-0">
        <MessageInput
          onSend={handleSend}
          onSendWithAttachment={handleSendWithAttachment}
          disabled={sending}
        />
      </div>
    </div>
  );
}
