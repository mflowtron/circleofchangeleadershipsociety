import { memo } from 'react';
import { cn } from '@/lib/utils';
import { ReactionDetailsPopover, Reactor } from './ReactionDetailsPopover';

export interface MessageReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface ReactionBarProps {
  reactions: MessageReaction[];
  messageId: string;
  onToggle: (emoji: string) => void;
  onFetchReactors: (messageId: string, emoji: string) => Promise<Reactor[]>;
  isOwn?: boolean;
}

export const ReactionBar = memo(function ReactionBar({ 
  reactions, 
  messageId,
  onToggle,
  onFetchReactors,
  isOwn = false 
}: ReactionBarProps) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className={cn(
      "flex gap-1 mt-1 flex-wrap",
      isOwn ? "justify-end" : "justify-start"
    )}>
      {reactions.map(r => (
        <ReactionDetailsPopover
          key={r.emoji}
          emoji={r.emoji}
          count={r.count}
          reacted={r.reacted}
          messageId={messageId}
          onToggle={() => onToggle(r.emoji)}
          onFetchReactors={onFetchReactors}
          isOwn={isOwn}
        />
      ))}
    </div>
  );
});
