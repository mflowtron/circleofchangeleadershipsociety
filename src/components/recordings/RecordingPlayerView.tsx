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

  // Generate captions with user-friendly error handling
  const handleGenerateCaptions = async () => {
    if (!recording.mux_asset_id) {
      toast.error('Video is still processing', {
        description: 'Please wait for the video to finish processing before generating captions.',
      });
      return;
    }

    setIsGeneratingCaptions(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in', {
          description: 'You need to be signed in to generate captions.',
        });
        setIsGeneratingCaptions(false);
        return;
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
        // Parse specific error types for user-friendly messages
        const errorMessage = data.error || '';
        
        if (errorMessage.includes('Unauthorized') || errorMessage.includes('Auth')) {
          toast.error('Session expired', {
            description: 'Please refresh the page and try again.',
          });
        } else if (errorMessage.includes('No audio track')) {
          toast.error('No audio found', {
            description: 'This video has no audio track to transcribe.',
          });
        } else if (errorMessage.includes('already') || errorMessage.includes('generating')) {
          toast.error('Captions in progress', {
            description: 'Caption generation is already underway for this video.',
          });
        } else if (response.status === 500) {
          toast.error('Server error', {
            description: 'Something went wrong on our end. Please try again later.',
          });
        } else {
          toast.error('Caption generation failed', {
            description: errorMessage || 'An unexpected error occurred. Please try again.',
          });
        }
        setIsGeneratingCaptions(false);
        return;
      }

      setCaptionsStatus('generating');
      toast.success('Caption generation started', {
        description: 'This may take a few minutes depending on video length.',
      });
    } catch (error) {
      console.error('Error generating captions:', error);
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('Connection error', {
          description: 'Unable to reach the server. Please check your internet connection.',
        });
      } else {
        toast.error('Something went wrong', {
          description: 'Please try again. If the problem persists, contact support.',
        });
      }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="hidden xs:inline">Back to Recordings</span>
          <span className="xs:hidden">Back</span>
        </Button>
        
        {/* Caption generation button for admins */}
        {showCaptionButton && (
          <Button
            variant="outline"
            onClick={handleGenerateCaptions}
            disabled={isCaptionsGenerating}
            className="w-full sm:w-auto"
          >
            {isCaptionsGenerating ? (
              <>
                <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                <span className="hidden sm:inline">Generating Captions...</span>
                <span className="sm:hidden">Generating...</span>
              </>
            ) : (
              <>
                <Captions className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Generate Captions</span>
                <span className="sm:hidden">Captions</span>
              </>
            )}
          </Button>
        )}
        
        {isCaptionsGenerating && !showCaptionButton && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="hidden sm:inline">Generating captions...</span>
            <span className="sm:hidden">Generating...</span>
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
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="details" className="gap-1 sm:gap-2 px-2 sm:px-3">
            <Info className="h-4 w-4" />
            <span className="hidden xs:inline">Details</span>
          </TabsTrigger>
          <TabsTrigger value="transcript" className="gap-1 sm:gap-2 px-2 sm:px-3" disabled={!hasCaptions}>
            <FileText className="h-4 w-4" />
            <span className="hidden xs:inline">Transcript</span>
            {!hasCaptions && captionsStatus !== 'generating' && (
              <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">(unavailable)</span>
            )}
            {captionsStatus === 'generating' && (
              <Loader2 className="h-3 w-3 animate-spin ml-1" />
            )}
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-1 sm:gap-2 px-2 sm:px-3">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden xs:inline">Resources</span>
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
