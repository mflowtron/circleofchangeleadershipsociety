import { Button } from '@/components/ui/button';
import { X, Play } from 'lucide-react';

interface VideoReadyPreviewProps {
  playbackId: string;
  onRemove: () => void;
}

export default function VideoReadyPreview({ playbackId, onRemove }: VideoReadyPreviewProps) {
  return (
    <div className="relative inline-block ml-13">
      <div className="flex items-center gap-3 p-2 pr-3 rounded-xl bg-primary/10 border border-primary/20">
        {/* Video thumbnail preview */}
        <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          <img
            src={`https://image.mux.com/${playbackId}/thumbnail.png?width=160&height=112&fit_mode=smartcrop`}
            alt="Video preview"
            className="w-full h-full object-cover"
          />
          {/* Play icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="h-3 w-3 text-foreground fill-current ml-0.5" />
            </div>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Video ready</p>
          <p className="text-xs text-muted-foreground">Your video will be attached to this post</p>
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
