import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { AlbumComment } from '@/types/album';

export function useAlbumComments(photoId: string | undefined) {
  return useQuery({
    queryKey: ['album-comments', photoId],
    enabled: !!photoId,
    queryFn: async (): Promise<AlbumComment[]> => {
      const { data, error } = await supabase
        .from('album_photo_comments')
        .select('*')
        .eq('photo_id', photoId!)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const userIds = Array.from(new Set((data ?? []).map((c) => c.user_id)));
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      return (data ?? []).map((c) => {
        const p = profileMap.get(c.user_id);
        return {
          ...c,
          author: {
            full_name: p?.full_name ?? 'Member',
            avatar_url: p?.avatar_url ?? null,
          },
        };
      });
    },
  });
}

export function useAddAlbumComment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ photoId, content }: { photoId: string; content: string }) => {
      if (!user) throw new Error('Not authenticated');
      const trimmed = content.trim();
      if (!trimmed) throw new Error('Empty comment');
      if (trimmed.length > 1000) throw new Error('Comment too long');
      const { error } = await supabase
        .from('album_photo_comments')
        .insert({ photo_id: photoId, user_id: user.id, content: trimmed });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['album-comments', variables.photoId] });
      queryClient.invalidateQueries({ queryKey: ['album-photos'] });
      queryClient.invalidateQueries({ queryKey: ['album-photo', variables.photoId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not post comment'),
  });
}

export function useDeleteAlbumComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; photoId: string }) => {
      const { error } = await supabase.from('album_photo_comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['album-comments', variables.photoId] });
      queryClient.invalidateQueries({ queryKey: ['album-photos'] });
    },
    onError: () => toast.error('Could not delete comment'),
  });
}
