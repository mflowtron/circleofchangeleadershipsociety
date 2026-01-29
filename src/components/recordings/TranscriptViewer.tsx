import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { TranscriptCue, formatTimestamp } from '@/hooks/useTranscript';
import { cn } from '@/lib/utils';

interface TranscriptViewerProps {
  cues: TranscriptCue[];
  currentTime: number;
  loading: boolean;
  error: string | null;
  onCueClick: (cue: TranscriptCue) => void;
}

export function TranscriptViewer({
  cues,
  currentTime,
  loading,
  error,
  onCueClick,
}: TranscriptViewerProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const activeCueRef = useRef<HTMLButtonElement>(null);

  // Find the active cue based on current playback time
  const activeCueIndex = cues.findIndex(
    (cue) => currentTime >= cue.startTime && currentTime < cue.endTime
  );

  // Auto-scroll to keep active cue visible
  useEffect(() => {
    if (activeCueRef.current && activeCueIndex !== -1) {
      activeCueRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeCueIndex]);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>Failed to load transcript</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (cues.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>No transcript available</p>
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollAreaRef} className="h-[400px] pr-4">
      <div className="space-y-1 p-2">
        {cues.map((cue, index) => {
          const isActive = index === activeCueIndex;
          
          return (
            <button
              key={index}
              ref={isActive ? activeCueRef : null}
              onClick={() => onCueClick(cue)}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-colors flex gap-3 hover:bg-muted/50",
                isActive && "bg-primary/10 ring-1 ring-primary/20"
              )}
            >
              <span
                className={cn(
                  "text-xs font-mono shrink-0 pt-0.5",
                  isActive ? "text-primary font-semibold" : "text-muted-foreground"
                )}
              >
                {formatTimestamp(cue.startTime)}
              </span>
              <span
                className={cn(
                  "text-sm leading-relaxed",
                  isActive ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {cue.text}
              </span>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

