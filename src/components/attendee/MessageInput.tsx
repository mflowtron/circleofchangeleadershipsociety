import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AttachmentPicker } from './AttachmentPicker';
import { AttachmentPreview } from './AttachmentPreview';

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  onSendWithAttachment?: (content: string, file: File) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({ 
  onSend, 
  onSendWithAttachment,
  disabled, 
  placeholder = 'Type a message...' 
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);

  const handleSend = async () => {
    const trimmed = message.trim();
    const hasContent = trimmed.length > 0;
    const hasAttachment = !!attachment;

    if ((!hasContent && !hasAttachment) || sending || disabled) return;

    setSending(true);
    try {
      if (hasAttachment && onSendWithAttachment) {
        await onSendWithAttachment(trimmed, attachment);
        setAttachment(null);
      } else if (hasContent) {
        await onSend(trimmed);
      }
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = (message.trim().length > 0 || !!attachment) && !sending && !disabled;

  return (
    <div 
      className="border-t border-border bg-background"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Attachment preview */}
      {attachment && (
        <div className="px-4 pt-3">
          <AttachmentPreview 
            file={attachment} 
            onRemove={() => setAttachment(null)}
            uploading={sending}
          />
        </div>
      )}
      
      <div className="flex items-end gap-2 p-4 pt-3">
        {onSendWithAttachment && (
          <AttachmentPicker
            onSelect={setAttachment}
            disabled={disabled || sending || !!attachment}
          />
        )}
        
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || sending}
          rows={1}
          className={cn(
            "min-h-[44px] max-h-[120px] resize-none py-3",
            "rounded-2xl border-muted-foreground/20"
          )}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!canSend}
          className="h-11 w-11 rounded-full shrink-0"
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
