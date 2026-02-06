import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Send, ImagePlus, Video, X, Globe, Users, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import VideoReadyPreview from './VideoReadyPreview';
import VideoUploadDialog from './VideoUploadDialog';

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

  // Video state
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [videoPlaybackId, setVideoPlaybackId] = useState<string | null>(null);
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);

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
    setIsVideoProcessing(false);
  };

  const openVideoUpload = () => {
    // Clear image if adding video
    if (imageFile) {
      removeImage();
    }
    setVideoDialogOpen(true);
  };

  const handleVideoReady = (playbackId: string) => {
    setVideoPlaybackId(playbackId);
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
              <VideoReadyPreview 
                playbackId={videoPlaybackId} 
                onRemove={removeVideo} 
              />
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
                  disabled={!!videoPlaybackId || isVideoProcessing}
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
                  disabled={!!imageFile || !!videoPlaybackId || isVideoProcessing}
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg px-2"
                >
                  {isVideoProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline ml-1.5">{isVideoProcessing ? 'Processing...' : 'Video'}</span>
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
                disabled={!content.trim() || loading || isVideoProcessing}
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

      <VideoUploadDialog
        open={videoDialogOpen}
        onOpenChange={setVideoDialogOpen}
        onVideoReady={handleVideoReady}
        onProcessingChange={setIsVideoProcessing}
      />
    </>
  );
}
