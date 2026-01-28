import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import MuxPlayer from '@mux/mux-player-react';
import MuxUploader from '@mux/mux-uploader-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Play, Calendar, Plus, Upload, Loader2, X, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Recording {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  mux_playback_id: string | null;
  thumbnail_url: string | null;
  created_at: string;
  status: string | null;
}

export default function Recordings() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreatingUpload, setIsCreatingUpload] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const { role } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

  const canUpload = role === 'admin' || role === 'advisor';
  const canDelete = role === 'admin';

  const deleteRecording = async (recordingId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    try {
      const { error } = await supabase
        .from('recordings')
        .delete()
        .eq('id', recordingId);

      if (error) throw error;

      toast({
        title: 'Recording deleted',
        description: 'The recording has been removed.',
      });

      // Clear selection if deleted recording was selected
      if (selectedRecording?.id === recordingId) {
        setSelectedRecording(null);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting recording',
        description: error.message,
      });
    }
  };
  useEffect(() => {
    setSelectedRecording(null);
  }, [location.key]);

  // Fetch recordings and subscribe to realtime updates
  useEffect(() => {
    fetchRecordings();
    
    // Subscribe to realtime updates for recordings
    const channel = supabase
      .channel('recordings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recordings',
        },
        (payload) => {
          console.log('Recording update received:', payload);
          fetchRecordings(); // Refresh when any recording changes
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, []);

  const fetchRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .in('status', ['ready', 'preparing'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecordings(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading recordings',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const createUpload = async () => {
    if (!title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Title required',
        description: 'Please enter a title for the recording.',
      });
      return;
    }

    setIsCreatingUpload(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('mux-upload', {
        body: {
          action: 'create-upload',
          title,
          description,
        },
      });

      if (response.error) throw new Error(response.error.message);

      const { upload_url, upload_id, recording_id } = response.data;
      setUploadUrl(upload_url);
      setUploadId(upload_id);
      setRecordingId(recording_id);
      setUploadStatus('ready');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error creating upload',
        description: error.message,
      });
    } finally {
      setIsCreatingUpload(false);
    }
  };

  const checkUploadStatus = async () => {
    if (!uploadId || !recordingId) return;

    try {
      const response = await supabase.functions.invoke('mux-upload', {
        body: {
          action: 'check-status',
          upload_id: uploadId,
          recording_id: recordingId,
        },
      });

      if (response.error) throw new Error(response.error.message);

      const { status, playback_id } = response.data;
      setUploadStatus(status);

      if (status === 'ready' && playback_id) {
        // Upload complete and asset ready
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
        }
        toast({
          title: 'Upload complete!',
          description: 'Your recording is now available.',
        });
        resetUploadState();
        fetchRecordings();
      }
    } catch (error: any) {
      console.error('Status check error:', error);
    }
  };

  const handleUploadSuccess = () => {
    setUploadStatus('processing');
    toast({
      title: 'Upload received',
      description: 'Processing your video...',
    });

    // Start polling for asset readiness
    statusCheckInterval.current = setInterval(checkUploadStatus, 3000);
  };

  const resetUploadState = () => {
    setUploadUrl(null);
    setUploadId(null);
    setRecordingId(null);
    setTitle('');
    setDescription('');
    setUploadStatus(null);
    setUploadDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Lecture Recordings</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-video bg-muted" />
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Lecture Recordings</h1>
        
        {canUpload && (
          <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
            if (!open) resetUploadState();
            setUploadDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Recording
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload New Recording</DialogTitle>
              </DialogHeader>
              
              {!uploadUrl ? (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter recording title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description..."
                    />
                  </div>
                  <Button 
                    onClick={createUpload} 
                    className="w-full"
                    disabled={isCreatingUpload || !title.trim()}
                  >
                    {isCreatingUpload ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Preparing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Continue to Upload
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="py-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload your video file. Supported formats: MP4, MOV, MKV, WEBM
                  </p>
                  
                  <MuxUploader
                    endpoint={uploadUrl}
                    onSuccess={handleUploadSuccess}
                    className="w-full"
                  />
                  
                  {uploadStatus === 'processing' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing video... This may take a few minutes.
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {selectedRecording && selectedRecording.mux_playback_id && (
        <Card className="relative">
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-3 right-3 z-10 rounded-full bg-background/80 backdrop-blur-sm"
            onClick={() => setSelectedRecording(null)}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardContent className="p-0">
            <MuxPlayer
              playbackId={selectedRecording.mux_playback_id}
              metadata={{
                video_title: selectedRecording.title,
              }}
              accentColor="#C9A55C"
              className="w-full aspect-video rounded-t-lg"
            />
            <div className="p-4">
              <h2 className="text-xl font-semibold">{selectedRecording.title}</h2>
              {selectedRecording.description && (
                <p className="text-muted-foreground mt-2">{selectedRecording.description}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {recordings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No recordings available yet.</p>
            {canUpload && (
              <p className="text-sm text-muted-foreground mt-2">
                Click "Upload Recording" to add your first video.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recordings.map((recording) => (
            <Card
              key={recording.id}
              className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => setSelectedRecording(recording)}
            >
              <div className="aspect-video bg-secondary relative flex items-center justify-center">
                {recording.mux_playback_id ? (
                  <img
                    src={`https://image.mux.com/${recording.mux_playback_id}/thumbnail.jpg?time=5`}
                    alt={recording.title}
                    className="w-full h-full object-cover"
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
                <div className="absolute inset-0 bg-foreground/0 hover:bg-foreground/20 flex items-center justify-center transition-colors">
                  <Play className="h-12 w-12 text-primary-foreground opacity-0 hover:opacity-100" />
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
                            onClick={(e) => deleteRecording(recording.id, e)}
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
          ))}
        </div>
      )}
    </div>
  );
}
