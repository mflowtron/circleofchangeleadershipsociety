import { useState, useRef, useEffect, useCallback } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import type MuxPlayerElement from '@mux/mux-player';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, Captions, FileText, FolderOpen, Info } from 'lucide-react';
import { Recording } from './RecordingCard';
import { RecordingDetails } from './RecordingDetails';
import { RecordingResources } from './RecordingResources';
import { ResourceUploadDialog } from './ResourceUploadDialog';
import { TranscriptViewer } from './TranscriptViewer';
import { useRecordingResources } from '@/hooks/useRecordingResources';
import { useTranscript, TranscriptCue } from '@/hooks/useTranscript';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [currentTime, setCurrentTime] = useState(0);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [captionsStatus, setCaptionsStatus] = useState<string | null>(recording.captions_status ?? null);
  const [captionsTrackId, setCaptionsTrackId] = useState<string | null>(recording.captions_track_id ?? null);
  
  const playerRef = useRef<MuxPlayerElement | null>(null);
  
  const { resources, loading: resourcesLoading, uploading, uploadResource, deleteResource } = useRecordingResources(recording.id);
  const { cues, loading: transcriptLoading, error: transcriptError } = useTranscript(
    recording.mux_playback_id,
    captionsTrackId
  );

  // Subscribe to realtime updates for caption status
  useEffect(() => {
    const channel = supabase
      .channel(`recording-captions-${recording.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recordings',
          filter: `id=eq.${recording.id}`,
        },
        (payload) => {
          const newRecord = payload.new as { captions_status: string | null; captions_track_id: string | null };
          setCaptionsStatus(newRecord.captions_status);
          setCaptionsTrackId(newRecord.captions_track_id);
          
          if (newRecord.captions_status === 'ready') {
            toast.success('Captions are now available!');
            setIsGeneratingCaptions(false);
          } else if (newRecord.captions_status === 'error') {
            toast.error('Caption generation failed');
            setIsGeneratingCaptions(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recording.id]);

  // Handle time updates from the player
  const handleTimeUpdate = useCallback(() => {
    if (playerRef.current?.media?.nativeEl) {
      setCurrentTime(playerRef.current.media.nativeEl.currentTime);
    }
  }, []);

  // Set up player ref and event listener
  const handlePlayerRef = useCallback((el: MuxPlayerElement | null) => {
    if (el) {
      playerRef.current = el;
      if (el.media?.nativeEl) {
        el.media.nativeEl.addEventListener('timeupdate', handleTimeUpdate);
      }
    }
  }, [handleTimeUpdate]);

  // Cleanup event listener
  useEffect(() => {
    return () => {
      if (playerRef.current?.media?.nativeEl) {
        playerRef.current.media.nativeEl.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, [handleTimeUpdate]);

  // Handle seeking when clicking on transcript cue
  const handleCueClick = useCallback((cue: TranscriptCue) => {
    if (playerRef.current?.media?.nativeEl) {
      playerRef.current.media.nativeEl.currentTime = cue.startTime;
      playerRef.current.media.nativeEl.play();
    }
  }, []);

  // Generate captions
  const handleGenerateCaptions = async () => {
    if (!recording.mux_asset_id) {
      toast.error('Video asset not ready');
      return;
    }

    setIsGeneratingCaptions(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mux-upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'generate-captions',
            recording_id: recording.id,
            asset_id: recording.mux_asset_id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate captions');
      }

      setCaptionsStatus('generating');
      toast.success('Caption generation started. This may take a few minutes.');
    } catch (error) {
      console.error('Error generating captions:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate captions');
      setIsGeneratingCaptions(false);
    }
  };

  const showCaptionButton = canManageResources && 
    (!captionsStatus || captionsStatus === 'error') && 
    recording.mux_asset_id;

  const isCaptionsGenerating = captionsStatus === 'generating' || isGeneratingCaptions;
  const hasCaptions = captionsStatus === 'ready' && captionsTrackId;

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Recordings
        </Button>
        
        {/* Caption generation button for admins */}
        {showCaptionButton && (
          <Button
            variant="outline"
            onClick={handleGenerateCaptions}
            disabled={isCaptionsGenerating}
          >
            {isCaptionsGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Captions...
              </>
            ) : (
              <>
                <Captions className="h-4 w-4 mr-2" />
                Generate Captions
              </>
            )}
          </Button>
        )}
        
        {isCaptionsGenerating && !showCaptionButton && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating captions...
          </div>
        )}
      </div>

      {/* Video Player */}
      {recording.mux_playback_id && (
        <div className="rounded-lg overflow-hidden bg-black shadow-xl">
          <MuxPlayer
            ref={handlePlayerRef}
            playbackId={recording.mux_playback_id}
            metadata={{
              video_title: recording.title,
            }}
            accentColor="#C9A55C"
            className="w-full aspect-video"
          />
        </div>
      )}

      {/* Tabbed Content */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="details" className="gap-2">
            <Info className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="transcript" className="gap-2" disabled={!hasCaptions}>
            <FileText className="h-4 w-4" />
            Transcript
            {!hasCaptions && captionsStatus !== 'generating' && (
              <span className="text-xs text-muted-foreground ml-1">(unavailable)</span>
            )}
            {captionsStatus === 'generating' && (
              <Loader2 className="h-3 w-3 animate-spin ml-1" />
            )}
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Resources
            {resources.length > 0 && (
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full ml-1">
                {resources.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <RecordingDetails recording={recording} />
        </TabsContent>

        <TabsContent value="transcript" className="mt-4">
          {hasCaptions ? (
            <TranscriptViewer
              cues={cues}
              currentTime={currentTime}
              loading={transcriptLoading}
              error={transcriptError}
              onCueClick={handleCueClick}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {captionsStatus === 'generating' ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p>Generating captions...</p>
                  <p className="text-sm">This may take a few minutes depending on video length.</p>
                </div>
              ) : (
                <p>No transcript available for this recording.</p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resources" className="mt-4">
          <RecordingResources
            resources={resources}
            loading={resourcesLoading}
            canManage={canManageResources}
            onDelete={deleteResource}
            onUploadClick={() => setUploadDialogOpen(true)}
          />
        </TabsContent>
      </Tabs>

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
