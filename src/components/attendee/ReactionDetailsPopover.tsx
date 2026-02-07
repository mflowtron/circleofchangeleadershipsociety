import { useState, useEffect, memo } from 'react';
import { Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Reactor {
  type: 'attendee' | 'speaker';
  id: string;
  name: string;
  avatar_url?: string;
  title?: string;
  is_you?: boolean;
}

interface ReactionDetailsPopoverProps {
  emoji: string;
  count: number;
  reacted: boolean;
  messageId: string;
  onToggle: () => void;
  onFetchReactors: (messageId: string, emoji: string) => Promise<Reactor[]>;
  isOwn?: boolean;
}

export const ReactionDetailsPopover = memo(function ReactionDetailsPopover({
  emoji,
  count,
  reacted,
  messageId,
  onToggle,
  onFetchReactors,
  isOwn = false,
}: ReactionDetailsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [reactors, setReactors] = useState<Reactor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      onFetchReactors(messageId, emoji)
        .then(setReactors)
        .catch((err) => {
          console.error('Failed to fetch reactors:', err);
          setError('Failed to load');
        })
        .finally(() => setLoading(false));
    }
  }, [open, messageId, emoji, onFetchReactors]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors",
            reacted 
              ? "bg-primary/20 text-primary border border-primary/30" 
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <span>{emoji}</span>
          <span className="font-medium">{count}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-56 p-0" 
        align={isOwn ? "end" : "start"}
        side="top"
        sideOffset={4}
      >
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xl">{emoji}</span>
            <span className="font-medium text-sm">Reactions</span>
            <span className="text-xs text-muted-foreground">({count})</span>
          </div>
        </div>
        
        <div className="p-2 max-h-48 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive text-center py-4">{error}</p>
          ) : reactors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No reactions</p>
          ) : (
            <div className="space-y-1">
              {reactors.map((reactor) => (
                <div 
                  key={`${reactor.type}-${reactor.id}`} 
                  className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={reactor.avatar_url} alt={reactor.name} />
                    <AvatarFallback className="text-xs">
                      {reactor.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1 truncate">
                    {reactor.is_you ? 'You' : reactor.name}
                  </span>
                  {reactor.type === 'speaker' && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      Speaker
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-2 border-t border-border">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs h-8"
            onClick={handleToggle}
          >
            {reacted ? 'Remove your reaction' : 'Add your reaction'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
});
