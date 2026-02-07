import { memo } from 'react';
import { Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  isOwn?: boolean;
  messageContent?: string;
}

export const ReactionPicker = memo(function ReactionPicker({ 
  onSelect, 
  onClose,
  isOwn = false,
  messageContent
}: ReactionPickerProps) {
  const { toast } = useToast();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!messageContent) {
      onClose();
      return;
    }
    
    try {
      await navigator.clipboard.writeText(messageContent);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        variant: "destructive",
      });
    }
    onClose();
  };

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
          "absolute z-50 flex items-center gap-1 bg-background border border-border rounded-full px-2 py-1.5 shadow-lg",
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
        
        {/* Divider and Copy button - only show if there's content */}
        {messageContent && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-muted rounded-full transition-colors active:scale-110 flex items-center gap-1"
            >
              <Copy className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </>
  );
});
