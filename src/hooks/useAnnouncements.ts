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
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user, role } = useAuth();
  const { toast } = useToast();

  const fetchDismissals = useCallback(async () => {
    if (!user) return new Set<string>();
    
    const { data } = await supabase
      .from('dismissed_announcements')
      .select('announcement_id')
      .eq('user_id', user.id);
    
    return new Set(data?.map(d => d.announcement_id) || []);
  }, [user]);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all announcements for admin view
      const { data: allData, error: allError } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (allError) throw allError;
      setAllAnnouncements(allData || []);

      // Fetch active, non-expired announcements for regular view
      const now = new Date().toISOString();
      const { data: activeData, error: activeError } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false });

      if (activeError) throw activeError;

      // Show all active announcements (no longer filtering by dismissals)
      setAnnouncements(activeData || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchDismissals]);

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
    }
  }, [user, fetchAnnouncements]);

  const createAnnouncement = async (data: CreateAnnouncementData) => {
    if (!user || role !== 'admin') return;

    const { error } = await supabase
      .from('announcements')
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
      .from('announcements')
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
      .from('announcements')
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

  const dismissAnnouncement = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('dismissed_announcements')
      .insert({
        user_id: user.id,
        announcement_id: id,
      });

    if (error) {
      console.error('Error dismissing announcement:', error);
      return;
    }

    // Optimistically update UI
    setDismissedIds(prev => new Set([...prev, id]));
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  return {
    announcements,
    allAnnouncements,
    loading,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    dismissAnnouncement,
    refetch: fetchAnnouncements,
  };
}
