import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Play, Calendar, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface Recording {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  mux_playback_id: string | null;
  mux_asset_id: string | null;
  thumbnail_url: string | null;
  created_at: string;
  status: string | null;
  uploaded_by: string;
  captions_status: string | null;
  captions_track_id: string | null;
}

interface RecordingCardProps {
  recording: Recording;
  canDelete: boolean;
  onSelect: (recording: Recording) => void;
  onDelete: (recordingId: string, e: React.MouseEvent) => void;
}

export function RecordingCard({ recording, canDelete, onSelect, onDelete }: RecordingCardProps) {
  return (
    <Card
      className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all group"
      onClick={() => onSelect(recording)}
    >
      <div className="aspect-video bg-secondary relative flex items-center justify-center overflow-hidden">
        {recording.mux_playback_id ? (
          <img
            src={`https://image.mux.com/${recording.mux_playback_id}/thumbnail.jpg?time=5`}
            alt={recording.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <Play className="h-12 w-12 text-muted-foreground" />
        )}
        
        {recording.status === 'preparing' && (
          <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
            <div className="flex items-center gap-2 text-background text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </div>
          </div>
        )}
        
        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
          <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
            <Play className="h-8 w-8 text-primary-foreground ml-1" />
          </div>
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-base line-clamp-2">{recording.title}</CardTitle>
        {recording.description && (
          <CardDescription className="line-clamp-2">
            {recording.description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}</span>
          </div>
          
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Recording</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{recording.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={(e) => onDelete(recording.id, e)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
