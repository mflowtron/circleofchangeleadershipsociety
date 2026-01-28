import { useState } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from 'lucide-react';
import { Recording } from './RecordingCard';
import { RecordingDetails } from './RecordingDetails';
import { RecordingResources } from './RecordingResources';
import { ResourceUploadDialog } from './ResourceUploadDialog';
import { useRecordingResources } from '@/hooks/useRecordingResources';

interface RecordingPlayerViewProps {
  recording: Recording;
  canManageResources: boolean;
  onBack: () => void;
}

export function RecordingPlayerView({
  recording,
  canManageResources,
  onBack,
}: RecordingPlayerViewProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { resources, loading, uploading, uploadResource, deleteResource } = useRecordingResources(recording.id);

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Button variant="ghost" onClick={onBack} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Recordings
      </Button>

      {/* Video Player */}
      {recording.mux_playback_id && (
        <div className="rounded-lg overflow-hidden bg-black shadow-xl">
          <MuxPlayer
            playbackId={recording.mux_playback_id}
            metadata={{
              video_title: recording.title,
            }}
            accentColor="#C9A55C"
            className="w-full aspect-video"
          />
        </div>
      )}

      {/* Recording Details */}
      <RecordingDetails recording={recording} />

      <Separator />

      {/* Resources Section */}
      <RecordingResources
        resources={resources}
        loading={loading}
        canManage={canManageResources}
        onDelete={deleteResource}
        onUploadClick={() => setUploadDialogOpen(true)}
      />

      {/* Upload Dialog */}
      <ResourceUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUpload={uploadResource}
        uploading={uploading}
      />
    </div>
  );
}
