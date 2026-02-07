import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: string;
}

interface CreateAnnouncementData {
  title: string;
  content: string;
  is_active?: boolean;
  expires_at?: string | null;
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, role } = useAuth();
  const { toast } = useToast();

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all announcements for admin view
      const { data: allData, error: allError } = await supabase
        .from('lms_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (allError) throw allError;
      setAllAnnouncements(allData || []);

      // Fetch active, non-expired announcements for regular view
      const now = new Date().toISOString();
      const { data: activeData, error: activeError } = await supabase
        .from('lms_announcements')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false });

      if (activeError) throw activeError;

      setAnnouncements(activeData || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
    }
  }, [user, fetchAnnouncements]);

  const createAnnouncement = async (data: CreateAnnouncementData) => {
    if (!user || role !== 'admin') return;

    const { error } = await supabase
      .from('lms_announcements')
      .insert({
        title: data.title,
        content: data.content,
        is_active: data.is_active ?? true,
        expires_at: data.expires_at || null,
        created_by: user.id,
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create announcement',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Announcement created successfully',
    });
    fetchAnnouncements();
  };

  const updateAnnouncement = async (id: string, data: Partial<CreateAnnouncementData>) => {
    if (!user || role !== 'admin') return;

    const { error } = await supabase
      .from('lms_announcements')
      .update(data)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update announcement',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Announcement updated successfully',
    });
    fetchAnnouncements();
  };

  const deleteAnnouncement = async (id: string) => {
    if (!user || role !== 'admin') return;

    const { error } = await supabase
      .from('lms_announcements')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete announcement',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Announcement deleted successfully',
    });
    fetchAnnouncements();
  };

  return {
    announcements,
    allAnnouncements,
    loading,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    refetch: fetchAnnouncements,
  };
}
