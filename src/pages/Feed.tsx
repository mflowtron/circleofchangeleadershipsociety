import { useState } from 'react';
import { usePosts } from '@/hooks/usePosts';
import PostCard from '@/components/feed/PostCard';
import CreatePostForm from '@/components/feed/CreatePostForm';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

type FilterType = 'all' | 'chapter' | 'mine';

export default function Feed() {
  const [filter, setFilter] = useState<FilterType>('all');
  const { posts, loading, createPost, toggleLike, deletePost } = usePosts(filter);
  const { profile, role } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Feed</h1>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList>
            <TabsTrigger value="all">All Posts</TabsTrigger>
            {profile?.chapter_id && (
              <TabsTrigger value="chapter">My Chapter</TabsTrigger>
            )}
            <TabsTrigger value="mine">My Posts</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <CreatePostForm onSubmit={createPost} hasChapter={!!profile?.chapter_id} />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-lg p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="w-24 h-4 bg-muted rounded" />
                  <div className="w-16 h-3 bg-muted rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="w-full h-4 bg-muted rounded" />
                <div className="w-3/4 h-4 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg">
          <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={() => toggleLike(post.id, post.user_has_liked)}
              onDelete={() => deletePost(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
