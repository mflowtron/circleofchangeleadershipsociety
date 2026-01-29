import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trash2, Globe, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: string;
  content: string;
  is_global: boolean;
  created_at: string;
  author: {
    full_name: string;
    avatar_url: string | null;
  };
  chapter_name: string | null;
}

export default function Moderation() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          is_global,
          created_at,
          user_id,
          chapter_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedPosts = await Promise.all(
        (data || []).map(async (post) => {
          const { data: authorData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', post.user_id)
            .single();

          let chapterName = null;
          if (post.chapter_id) {
            const { data: chapterData } = await supabase
              .from('chapters')
              .select('name')
              .eq('id', post.chapter_id)
              .single();
            chapterName = chapterData?.name || null;
          }

          return {
            id: post.id,
            content: post.content,
            is_global: post.is_global,
            created_at: post.created_at,
            author: authorData || { full_name: 'Unknown', avatar_url: null },
            chapter_name: chapterName,
          };
        })
      );

      setPosts(enrichedPosts);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading posts',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      
      toast({ title: 'Post deleted' });
      fetchPosts();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting post',
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Content Moderation</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Content Moderation</h1>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No posts to moderate.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const initials = post.author.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase();

            return (
              <Card key={post.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar className="flex-shrink-0">
                        <AvatarImage src={post.author.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium truncate">{post.author.full_name}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          {post.is_global ? (
                            <>
                              <Globe className="h-3 w-3 flex-shrink-0" />
                              <span>Everyone</span>
                            </>
                          ) : (
                            <>
                              <Users className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{post.chapter_name || 'Chapter'}</span>
                            </>
                          )}
                        </div>
                        <p className="mt-2 text-foreground break-words">{post.content}</p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(post.id)}
                      className="w-full sm:w-auto flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
