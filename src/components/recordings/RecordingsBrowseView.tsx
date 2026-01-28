import { Card, CardContent } from '@/components/ui/card';
import { Play } from 'lucide-react';
import { RecordingCard, Recording } from './RecordingCard';

interface RecordingsBrowseViewProps {
  recordings: Recording[];
  canDelete: boolean;
  onSelect: (recording: Recording) => void;
  onDelete: (recordingId: string, e: React.MouseEvent) => void;
}

export function RecordingsBrowseView({
  recordings,
  canDelete,
  onSelect,
  onDelete,
}: RecordingsBrowseViewProps) {
  if (recordings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No recordings available yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {recordings.map((recording) => (
        <RecordingCard
          key={recording.id}
          recording={recording}
          canDelete={canDelete}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
