import { memo } from 'react';
import { cn } from '@/lib/utils';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  isOwn?: boolean;
}

export const ReactionPicker = memo(function ReactionPicker({ 
  onSelect, 
  onClose,
  isOwn = false 
}: ReactionPickerProps) {
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
        onTouchEnd={onClose}
      />
      
      {/* Picker */}
      <div 
        className={cn(
          "absolute z-50 flex gap-1 bg-background border border-border rounded-full px-2 py-1.5 shadow-lg",
          isOwn ? "right-0" : "left-0",
          "-top-10"
        )}
      >
        {REACTIONS.map(emoji => (
          <button 
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(emoji);
            }}
            className="p-1.5 hover:bg-muted rounded-full text-lg transition-colors active:scale-110"
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
});
