import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RecordingResource {
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

export function useRecordingResources(recordingId: string | null) {
  const [resources, setResources] = useState<RecordingResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchResources = useCallback(async () => {
    if (!recordingId) {
      setResources([]);
      return;
    }

    setLoading(true);
    try {
      // Resources are now stored in the recordings.resources JSONB column
      const { data, error } = await supabase
        .from('recordings')
        .select('resources')
        .eq('id', recordingId)
        .single();

      if (error) throw error;
      
      // Parse the JSONB resources array
      const resourcesArray = (data?.resources as RecordingResource[]) || [];
      setResources(resourcesArray);
    } catch (error: any) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  }, [recordingId]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

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

      // Get current resources and add new one
      const { data: currentData, error: fetchError } = await supabase
        .from('recordings')
        .select('resources')
        .eq('id', recordingId)
        .single();

      if (fetchError) throw fetchError;

      const currentResources = (currentData?.resources as RecordingResource[]) || [];
      const newResource: RecordingResource = {
        name: file.name,
        file_url: publicUrl,
        file_type: fileExt.toLowerCase(),
        file_size: file.size,
      };

      // Update recording with new resources array
      const { error: updateError } = await supabase
        .from('recordings')
        .update({ resources: [...currentResources, newResource] })
        .eq('id', recordingId);

      if (updateError) throw updateError;

      toast.success('Resource uploaded', {
        description: `${file.name} has been attached to this recording.`,
      });

      fetchResources();
    } catch (error: any) {
      toast.error('Upload failed', {
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteResource = async (resource: RecordingResource) => {
    if (!recordingId) return;

    try {
      // Extract file path from URL for deletion
      const urlParts = resource.file_url.split('/recording-resources/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage
          .from('recording-resources')
          .remove([filePath]);
      }

      // Get current resources and filter out the deleted one
      const { data: currentData, error: fetchError } = await supabase
        .from('recordings')
        .select('resources')
        .eq('id', recordingId)
        .single();

      if (fetchError) throw fetchError;

      const currentResources = (currentData?.resources as RecordingResource[]) || [];
      const updatedResources = currentResources.filter(r => r.file_url !== resource.file_url);

      // Update recording with filtered resources array
      const { error: updateError } = await supabase
        .from('recordings')
        .update({ resources: updatedResources })
        .eq('id', recordingId);

      if (updateError) throw updateError;

      toast.success('Resource deleted', {
        description: `${resource.name} has been removed.`,
      });

      fetchResources();
    } catch (error: any) {
      toast.error('Delete failed', {
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
