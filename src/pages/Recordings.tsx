import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import MuxUploader from '@mux/mux-uploader-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Upload, Loader2 } from 'lucide-react';
import { RecordingsBrowseView } from '@/components/recordings/RecordingsBrowseView';
import { RecordingPlayerView } from '@/components/recordings/RecordingPlayerView';
import { Recording } from '@/components/recordings/RecordingCard';

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
  const canManageResources = role === 'admin' || role === 'advisor';

  const deleteRecording = async (recordingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await supabase.functions.invoke('mux-upload', {
        body: {
          action: 'delete-asset',
          recording_id: recordingId,
        },
      });

      if (response.error) throw new Error(response.error.message);

      toast({
        title: 'Recording deleted',
        description: 'The recording and video asset have been removed.',
      });

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

  useEffect(() => {
    fetchRecordings();
    
    const channel = supabase
      .channel('recordings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recordings',
        },
        () => {
          fetchRecordings();
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
              <div className="p-4 space-y-2">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Player mode: show dedicated player view
  if (selectedRecording) {
    return (
      <RecordingPlayerView
        recording={selectedRecording}
        canManageResources={canManageResources}
        onBack={() => setSelectedRecording(null)}
      />
    );
  }

  // Browse mode: show grid of recordings
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
                      rows={4}
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

      <RecordingsBrowseView
        recordings={recordings}
        canDelete={canDelete}
        onSelect={setSelectedRecording}
        onDelete={deleteRecording}
      />
    </div>
  );
}
