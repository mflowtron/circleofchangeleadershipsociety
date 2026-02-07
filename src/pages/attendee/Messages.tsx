import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Search, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useConversations } from '@/hooks/useConversations';
import { useAttendee } from '@/contexts/AttendeeContext';
import { ConversationCard } from '@/components/attendee/ConversationCard';
import { CreateGroupDialog } from '@/components/attendee/CreateGroupDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function Messages() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { email, sessionToken, selectedAttendee, selectedEvent } = useAttendee();
  const { conversations, loading, refetch } = useConversations();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [joiningEventChat, setJoiningEventChat] = useState(false);

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    if (conv.name?.toLowerCase().includes(query)) return true;
    if (conv.other_participant?.name.toLowerCase().includes(query)) return true;
    if (conv.last_message?.content.toLowerCase().includes(query)) return true;
    
    return false;
  });

  // Check if user has joined event chat
  const hasEventChat = conversations.some(c => c.type === 'event');

  const joinEventChat = async () => {
    if (!email || !sessionToken || !selectedAttendee || !selectedEvent) return;

    setJoiningEventChat(true);
    try {
      const { data, error } = await supabase.functions.invoke('join-event-chat', {
        body: {
          email,
          session_token: sessionToken,
          attendee_id: selectedAttendee.id,
          event_id: selectedEvent.id
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await refetch();
      
      if (!data.already_joined) {
        toast({
          title: 'Joined event chat!',
          description: 'You can now chat with all attendees'
        });
      }

      navigate(`/attendee/app/messages/${data.conversation_id}`);
    } catch (err: any) {
      console.error('Failed to join event chat:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to join event chat',
        variant: 'destructive'
      });
    } finally {
      setJoiningEventChat(false);
    }
  };

  if (loading) {
    return (
      <div className="pb-20">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header Actions */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-2 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="pl-9"
            />
          </div>
          <Button
            size="icon"
            variant="outline"
            onClick={() => navigate('/attendee/app/networking')}
            title="Find people"
          >
            <Users className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={() => setShowCreateGroup(true)}
            title="Create group"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Join Event Chat Banner */}
      {!hasEventChat && (
        <div className="mx-4 mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Radio className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Join the Event Chat</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Connect with all attendees in the general discussion
              </p>
              <Button
                size="sm"
                className="mt-2"
                onClick={joinEventChat}
                disabled={joiningEventChat}
              >
                {joiningEventChat ? 'Joining...' : 'Join Chat'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[40vh]">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium mb-2">
            {searchQuery ? 'No conversations found' : 'Start connecting!'}
          </h2>
          <p className="text-muted-foreground text-sm max-w-xs mb-4">
            {searchQuery 
              ? 'Try a different search term'
              : 'Find speakers and attendees to message, or create a group chat'
            }
          </p>
          {!searchQuery && (
            <Button onClick={() => navigate('/attendee/app/networking')}>
              <Users className="h-4 w-4 mr-2" />
              Find People
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filteredConversations.map(conv => (
            <ConversationCard
              key={conv.id}
              conversation={conv}
              onClick={() => navigate(`/attendee/app/messages/${conv.id}`)}
            />
          ))}
        </div>
      )}

      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
      />
    </div>
  );
}
