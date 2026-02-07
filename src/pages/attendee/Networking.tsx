import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useNetworking } from '@/hooks/useNetworking';
import { NetworkingCard } from '@/components/attendee/NetworkingCard';
import { useToast } from '@/hooks/use-toast';

export default function Networking() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { speakers, attendees, loading, search, createDM } = useNetworking();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingDM, setCreatingDM] = useState<string | null>(null);

  // Initial search
  useEffect(() => {
    search();
  }, [search]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      search(searchQuery || undefined);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, search]);

  const handleMessage = async (personId: string, type: 'attendee' | 'speaker') => {
    setCreatingDM(personId);

    try {
      const result = await createDM(
        type === 'attendee' ? personId : undefined,
        type === 'speaker' ? personId : undefined
      );

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to start conversation',
          variant: 'destructive'
        });
        return;
      }

      navigate(`/attendee/app/messages/${result.conversationId}`);
    } finally {
      setCreatingDM(null);
    }
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate('/attendee/app/messages')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold flex-1">Find People</h1>
        </div>
        
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, company, title..."
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Speakers Section */}
          {speakers.length > 0 && (
            <div>
              <h2 className="px-4 py-3 text-sm font-medium text-muted-foreground bg-muted/50">
                SPEAKERS ({speakers.length})
              </h2>
              {speakers.map(speaker => (
                <NetworkingCard
                  key={speaker.id}
                  person={speaker}
                  onMessage={() => handleMessage(speaker.id, 'speaker')}
                  loading={creatingDM === speaker.id}
                />
              ))}
            </div>
          )}

          {/* Attendees Section */}
          {attendees.length > 0 && (
            <div>
              <h2 className="px-4 py-3 text-sm font-medium text-muted-foreground bg-muted/50">
                OPEN TO NETWORKING ({attendees.length})
              </h2>
              {attendees.map(attendee => (
                <NetworkingCard
                  key={attendee.id}
                  person={attendee}
                  onMessage={() => handleMessage(attendee.id, 'attendee')}
                  loading={creatingDM === attendee.id}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {speakers.length === 0 && attendees.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center min-h-[40vh]">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-medium mb-2">
                {searchQuery ? 'No results found' : 'No one available yet'}
              </h2>
              <p className="text-muted-foreground text-sm max-w-xs">
                {searchQuery 
                  ? 'Try a different search term'
                  : 'Attendees who enable "Open to Networking" in their profile will appear here'
                }
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
