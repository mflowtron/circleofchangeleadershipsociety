import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ClickableUserAvatar } from '@/components/ui/clickable-user-avatar';
import { Link } from 'react-router-dom';

interface ChapterMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface ChapterPost {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author: {
    full_name: string;
    avatar_url: string | null;
  };
}

export default function MyChapter() {
  const [chapter, setChapter] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [members, setMembers] = useState<ChapterMember[]>([]);
  const [posts, setPosts] = useState<ChapterPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  useEffect(() => {
    fetchChapterData();
  }, [user]);

  const fetchChapterData = async () => {
    if (!user) return;

    // Get chapter_id directly from profile (no extra query needed)
    const chapterId = profile?.chapter_id;
    if (!chapterId) {
      setLoading(false);
      return;
    }

    try {

      // Get chapter details
      const { data: chapterData, error: chapterError } = await supabase
        .from('chapters')
        .select('id, name, description')
        .eq('id', chapterId)
        .single();

      if (chapterError) throw chapterError;
      setChapter(chapterData);

      // Get chapter members
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .eq('chapter_id', chapterId);

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Get chapter posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, content, created_at, user_id')
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      const enrichedPosts = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: authorData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', post.user_id)
            .single();

          return {
            id: post.id,
            content: post.content,
            created_at: post.created_at,
            user_id: post.user_id,
            author: authorData || { full_name: 'Unknown', avatar_url: null },
          };
        })
      );

      setPosts(enrichedPosts);
    } catch (error: any) {
      toast.error('Error loading chapter data', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      
      toast.success('Post deleted');
      fetchChapterData();
    } catch (error: any) {
      toast.error('Error deleting post', {
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">My Chapter</h1>
        <Card className="animate-pulse">
          <CardContent className="h-64" />
        </Card>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">My Chapter</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              You are not assigned to any chapter yet. Please contact an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{chapter.name}</h1>
        {chapter.description && (
          <p className="text-muted-foreground mt-1">{chapter.description}</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chapter Posts</CardTitle>
            <CardDescription>Posts shared within this chapter</CardDescription>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No chapter posts yet.
              </p>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <ClickableUserAvatar
                      userId={post.user_id}
                      fullName={post.author.full_name}
                      avatarUrl={post.author.avatar_url}
                      size="sm"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Link 
                            to={`/profile/${post.user_id}`}
                            className="font-medium text-sm hover:underline"
                          >
                            {post.author.full_name}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm mt-1">{post.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members
            </CardTitle>
            <CardDescription>{members.length} members</CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No members assigned yet.
              </p>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-2">
                    <ClickableUserAvatar
                      userId={member.user_id}
                      fullName={member.full_name}
                      avatarUrl={member.avatar_url}
                      size="sm"
                    />
                    <Link 
                      to={`/profile/${member.user_id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {member.full_name}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
