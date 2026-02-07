import { memo } from 'react';
import { cn } from '@/lib/utils';

export interface MessageReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface ReactionBarProps {
  reactions: MessageReaction[];
  onToggle: (emoji: string) => void;
  isOwn?: boolean;
}

export const ReactionBar = memo(function ReactionBar({ 
  reactions, 
  onToggle,
  isOwn = false 
}: ReactionBarProps) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className={cn(
      "flex gap-1 mt-1 flex-wrap",
      isOwn ? "justify-end" : "justify-start"
    )}>
      {reactions.map(r => (
        <button
          key={r.emoji}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(r.emoji);
          }}
          className={cn(
            "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors",
            r.reacted 
              ? "bg-primary/20 text-primary border border-primary/30" 
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <span>{r.emoji}</span>
          <span className="font-medium">{r.count}</span>
        </button>
      ))}
    </div>
  );
});
