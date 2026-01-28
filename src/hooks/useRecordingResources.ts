import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RecordingResource {
  id: string;
  recording_id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export function useRecordingResources(recordingId: string | null) {
  const [resources, setResources] = useState<RecordingResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!recordingId) {
      setResources([]);
      return;
    }

    fetchResources();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`recording-resources-${recordingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recording_resources',
          filter: `recording_id=eq.${recordingId}`,
        },
        () => {
          fetchResources();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recordingId]);

  const fetchResources = async () => {
    if (!recordingId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recording_resources')
        .select('*')
        .eq('recording_id', recordingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setResources(data || []);
    } catch (error: any) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadResource = async (file: File) => {
    if (!recordingId) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate unique file path
      const fileExt = file.name.split('.').pop() || 'file';
      const fileName = `${recordingId}/${Date.now()}-${file.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('recording-resources')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('recording-resources')
        .getPublicUrl(fileName);

      // Insert record
      const { error: insertError } = await supabase
        .from('recording_resources')
        .insert({
          recording_id: recordingId,
          name: file.name,
          file_url: publicUrl,
          file_type: fileExt.toLowerCase(),
          file_size: file.size,
          uploaded_by: user.id,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Resource uploaded',
        description: `${file.name} has been attached to this recording.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteResource = async (resource: RecordingResource) => {
    try {
      // Extract file path from URL for deletion
      const urlParts = resource.file_url.split('/recording-resources/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage
          .from('recording-resources')
          .remove([filePath]);
      }

      // Delete database record
      const { error } = await supabase
        .from('recording_resources')
        .delete()
        .eq('id', resource.id);

      if (error) throw error;

      toast({
        title: 'Resource deleted',
        description: `${resource.name} has been removed.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error.message,
      });
    }
  };

  return {
    resources,
    loading,
    uploading,
    uploadResource,
    deleteResource,
    refetch: fetchResources,
  };
}
