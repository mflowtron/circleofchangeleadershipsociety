import { useState, useRef } from 'react';
import MuxUploader, { MuxUploaderDrop, MuxUploaderFileSelect } from '@mux/mux-uploader-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Send, ImagePlus, Video, X, Globe, Users, Loader2, CheckCircle, FileUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreatePostFormProps {
  onSubmit: (content: string, isGlobal: boolean, imageFile?: File, videoPlaybackId?: string) => Promise<void>;
  hasChapter: boolean;
}

export default function CreatePostForm({ onSubmit, hasChapter }: CreatePostFormProps) {
  const [content, setContent] = useState('');
  const [isGlobal, setIsGlobal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  // Video upload state
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [videoUploadUrl, setVideoUploadUrl] = useState<string | null>(null);
  const [videoUploadId, setVideoUploadId] = useState<string | null>(null);
  const [videoPlaybackId, setVideoPlaybackId] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<'idle' | 'preparing' | 'uploading' | 'uploaded' | 'processing' | 'ready'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        return;
      }
      // Clear video if selecting image
      if (videoPlaybackId) {
        removeVideo();
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeVideo = () => {
    setVideoPlaybackId(null);
    setVideoUploadUrl(null);
    setVideoUploadId(null);
    setVideoStatus('idle');
    setUploadProgress(0);
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
    }
  };

  const handleUploadProgress = (e: unknown) => {
    const progress = (e as CustomEvent<number>).detail;
    setUploadProgress(Math.round(progress));
  };

  const openVideoUpload = async () => {
    // Clear image if adding video
    if (imageFile) {
      removeImage();
    }
    
    setVideoDialogOpen(true);
    setVideoStatus('preparing');

    try {
      const response = await supabase.functions.invoke('mux-upload', {
        body: { action: 'post-video-upload' },
      });

      if (response.error) throw new Error(response.error.message);

      setVideoUploadUrl(response.data.upload_url);
      setVideoUploadId(response.data.upload_id);
      setVideoStatus('idle');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error preparing upload',
        description: error.message,
      });
      setVideoDialogOpen(false);
      setVideoStatus('idle');
    }
  };

  const checkVideoStatus = async () => {
    if (!videoUploadId) return;

    try {
      const response = await supabase.functions.invoke('mux-upload', {
        body: {
          action: 'check-post-video',
          upload_id: videoUploadId,
        },
      });

      if (response.error) throw new Error(response.error.message);

      const { status, playback_id } = response.data;

      if (status === 'ready' && playback_id) {
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
        }
        setVideoPlaybackId(playback_id);
        setVideoStatus('ready');
        setVideoDialogOpen(false);
        toast({
          title: 'Video ready!',
          description: 'Your video has been processed and is ready to post.',
        });
      }
    } catch (error: any) {
      console.error('Video status check error:', error);
    }
  };

  const handleVideoUploadSuccess = () => {
    // First show upload complete state
    setVideoStatus('uploaded');
    
    // After a brief moment, transition to processing
    setTimeout(() => {
      setVideoStatus('processing');
      toast({
        title: 'Video uploaded',
        description: 'Processing your video...',
      });
      // Start polling for video readiness
      statusCheckInterval.current = setInterval(checkVideoStatus, 3000);
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    await onSubmit(content, isGlobal, imageFile || undefined, videoPlaybackId || undefined);
    setContent('');
    removeImage();
    removeVideo();
    setLoading(false);
  };

  return (
    <>
      <Card className="shadow-soft border-border/50 overflow-hidden">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/10 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Textarea
                placeholder="What's on your mind? Share with your community..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] resize-none bg-muted/30 border-border/50 focus:border-primary rounded-xl"
              />
            </div>
            
            {imagePreview && (
              <div className="relative inline-block ml-13">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-48 rounded-xl object-cover shadow-soft"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-medium"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {videoPlaybackId && (
              <div className="relative inline-block ml-13">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Video ready</p>
                    <p className="text-xs text-muted-foreground">Your video will be attached to this post</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={removeVideo}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  ref={fileInputRef}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!!videoPlaybackId || videoStatus === 'processing'}
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg px-2"
                >
                  <ImagePlus className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1.5">Photo</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={openVideoUpload}
                  disabled={!!imageFile || !!videoPlaybackId || videoStatus === 'processing'}
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg px-2"
                >
                  {videoStatus === 'processing' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline ml-1.5">{videoStatus === 'processing' ? 'Processing...' : 'Video'}</span>
                </Button>
                
                {hasChapter && (
                  <button
                    type="button"
                    onClick={() => setIsGlobal(!isGlobal)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                  >
                    {isGlobal ? (
                      <Globe className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium text-foreground">
                      {isGlobal ? 'Everyone' : 'Chapter'}
                    </span>
                  </button>
                )}
              </div>
              
              <Button 
                type="submit" 
                size="sm"
                disabled={!content.trim() || loading || videoStatus === 'processing'}
                className="btn-gold-glow rounded-xl px-4"
              >
                {loading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1.5">Post</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={videoDialogOpen} onOpenChange={(open) => {
        if (!open && videoStatus !== 'processing') {
          setVideoDialogOpen(false);
          if (!videoPlaybackId) {
            removeVideo();
          }
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Video</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {videoStatus === 'preparing' ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : videoStatus === 'uploaded' ? (
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
            ) : videoStatus === 'processing' ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  Processing your video... This may take a few minutes.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  You can close this dialog - we'll notify you when it's ready.
                </p>
              </div>
            ) : videoUploadUrl ? (
              <div className="space-y-4">
                {/* Hidden MuxUploader that powers everything */}
                <MuxUploader
                  id="post-video-uploader"
                  endpoint={videoUploadUrl}
                  onSuccess={handleVideoUploadSuccess}
                  onUploadStart={() => setVideoStatus('uploading')}
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
    </>
  );
}
