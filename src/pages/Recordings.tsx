import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Recording {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  created_at: string;
}

export default function Recordings() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Recording | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
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
      <h1 className="text-2xl font-bold text-foreground">Lecture Recordings</h1>

      {selectedVideo && (
        <Card>
          <CardContent className="p-0">
            <div className="aspect-video bg-secondary">
              <video
                src={selectedVideo.video_url}
                controls
                className="w-full h-full"
                autoPlay
              />
            </div>
            <div className="p-4">
              <h2 className="text-xl font-semibold">{selectedVideo.title}</h2>
              {selectedVideo.description && (
                <p className="text-muted-foreground mt-2">{selectedVideo.description}</p>
              )}
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setSelectedVideo(null)}
              >
                Close Video
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {recordings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No recordings available yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recordings.map((recording) => (
            <Card
              key={recording.id}
              className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => setSelectedVideo(recording)}
            >
              <div className="aspect-video bg-secondary relative flex items-center justify-center">
                {recording.thumbnail_url ? (
                  <img
                    src={recording.thumbnail_url}
                    alt={recording.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Play className="h-12 w-12 text-muted-foreground" />
                )}
                <div className="absolute inset-0 bg-foreground/0 hover:bg-foreground/20 flex items-center justify-center transition-colors">
                  <Play className="h-12 w-12 text-primary-foreground opacity-0 hover:opacity-100" />
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base line-clamp-2">{recording.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
