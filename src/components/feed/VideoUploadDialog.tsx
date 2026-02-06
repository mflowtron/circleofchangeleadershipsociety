import { useState, useRef, useEffect } from 'react';
import MuxUploader, { MuxUploaderDrop, MuxUploaderFileSelect } from '@mux/mux-uploader-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Video, Loader2, CheckCircle, FileUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type UploadStatus = 'idle' | 'preparing' | 'uploading' | 'uploaded' | 'processing' | 'ready';

interface VideoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVideoReady: (playbackId: string) => void;
  onProcessingChange: (isProcessing: boolean) => void;
}

export default function VideoUploadDialog({
  open,
  onOpenChange,
  onVideoReady,
  onProcessingChange,
}: VideoUploadDialogProps) {
  const { toast } = useToast();
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch upload URL when dialog opens
  useEffect(() => {
    if (open && !uploadUrl) {
      fetchUploadUrl();
    }
  }, [open]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, []);

  const fetchUploadUrl = async () => {
    setStatus('preparing');
    try {
      const response = await supabase.functions.invoke('mux-upload', {
        body: { action: 'post-video-upload' },
      });

      if (response.error) throw new Error(response.error.message);

      setUploadUrl(response.data.upload_url);
      setUploadId(response.data.upload_id);
      setStatus('idle');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error preparing upload',
        description: error.message,
      });
      onOpenChange(false);
      setStatus('idle');
    }
  };

  const checkVideoStatus = async () => {
    if (!uploadId) return;

    try {
      const response = await supabase.functions.invoke('mux-upload', {
        body: {
          action: 'check-post-video',
          upload_id: uploadId,
        },
      });

      if (response.error) throw new Error(response.error.message);

      const { status: videoStatus, playback_id } = response.data;

      if (videoStatus === 'ready' && playback_id) {
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
        }
        setStatus('ready');
        onVideoReady(playback_id);
        onProcessingChange(false);
        onOpenChange(false);
        toast({
          title: 'Video ready!',
          description: 'Your video has been processed and is ready to post.',
        });
        resetState();
      }
    } catch (error: any) {
      console.error('Video status check error:', error);
    }
  };

  const handleUploadProgress = (e: unknown) => {
    const progress = (e as CustomEvent<number>).detail;
    setUploadProgress(Math.round(progress));
  };

  const handleUploadSuccess = () => {
    setStatus('uploaded');
    
    setTimeout(() => {
      setStatus('processing');
      onProcessingChange(true);
      toast({
        title: 'Video uploaded',
        description: 'Processing your video...',
      });
      statusCheckInterval.current = setInterval(checkVideoStatus, 3000);
    }, 1500);
  };

  const resetState = () => {
    setUploadUrl(null);
    setUploadId(null);
    setStatus('idle');
    setUploadProgress(0);
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && status !== 'processing') {
      resetState();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {status === 'preparing' ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : status === 'uploaded' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-scale-in animate-pulse-gold">
                <CheckCircle className="h-8 w-8 text-primary animate-[bounce-check_0.5s_ease-out_0.1s_both]" />
              </div>
              <p className="font-medium text-foreground">
                Upload complete!
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Starting video processing...
              </p>
            </div>
          ) : status === 'processing' ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Processing your video... This may take a few minutes.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                You can close this dialog - we'll notify you when it's ready.
              </p>
            </div>
          ) : uploadUrl ? (
            <div className="space-y-4">
              {/* Hidden MuxUploader that powers everything */}
              <MuxUploader
                id="post-video-uploader"
                endpoint={uploadUrl}
                onSuccess={handleUploadSuccess}
                onUploadStart={() => setStatus('uploading')}
                onProgress={handleUploadProgress}
                noDrop
                noProgress
                noStatus
                className="hidden"
              />
              
              {/* Custom styled drop zone */}
              <MuxUploaderDrop
                muxUploader="post-video-uploader"
                className="border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                  border-border hover:border-primary/50 hover:bg-primary/5
                  [&[active]]:border-primary [&[active]]:bg-primary/10"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Video className="h-7 w-7 text-primary" />
                  </div>
                  
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      Drag and drop your video here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or
                    </p>
                  </div>
                  
                  <MuxUploaderFileSelect muxUploader="post-video-uploader">
                    <Button type="button" variant="outline" className="gap-2">
                      <FileUp className="h-4 w-4" />
                      Select Video
                    </Button>
                  </MuxUploaderFileSelect>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    MP4, MOV, MKV, WEBM supported
                  </p>
                </div>
              </MuxUploaderDrop>
              
              {/* Upload progress indicator */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uploading...</span>
                    <span className="font-medium text-foreground">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
