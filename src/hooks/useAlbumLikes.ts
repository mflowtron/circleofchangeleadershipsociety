import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useToggleAlbumLike() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ photoId, hasLiked }: { photoId: string; hasLiked: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      if (hasLiked) {
        const { error } = await supabase
          .from('album_photo_likes')
          .delete()
          .eq('photo_id', photoId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('album_photo_likes')
          .insert({ photo_id: photoId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['album-photos'] });
      queryClient.invalidateQueries({ queryKey: ['album-photo', variables.photoId] });
    },
    onError: () => toast.error('Could not update like'),
  });
}
