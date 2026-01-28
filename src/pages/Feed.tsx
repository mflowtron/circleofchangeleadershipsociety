import { useState, useCallback } from 'react';
import { usePosts } from '@/hooks/usePosts';
import PostCard from '@/components/feed/PostCard';
import CreatePostForm from '@/components/feed/CreatePostForm';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh';

type FilterType = 'all' | 'chapter' | 'mine';

export default function Feed() {
  const [filter, setFilter] = useState<FilterType>('all');
  const { posts, loading, createPost, toggleLike, deletePost, refetch } = usePosts(filter);
  const { profile } = useAuth();

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const { containerRef, pullDistance, isRefreshing, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
  });

  return (
    <div ref={containerRef} className="max-w-2xl mx-auto">
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        progress={progress}
      />
      
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Feed</h1>
            <p className="text-sm text-muted-foreground mt-1">Share and connect with your community</p>
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-soft">
                All Posts
              </TabsTrigger>
              {profile?.chapter_id && (
                <TabsTrigger value="chapter" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-soft">
                  My Chapter
                </TabsTrigger>
              )}
              <TabsTrigger value="mine" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-soft">
                My Posts
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <CreatePostForm onSubmit={createPost} hasChapter={!!profile?.chapter_id} />

        {loading ? (
          <div className="space-y-4 stagger-children">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-6 shadow-soft border border-border/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                  <div className="space-y-2 flex-1">
                    <div className="w-32 h-4 bg-muted rounded-lg animate-pulse" />
                    <div className="w-24 h-3 bg-muted rounded-lg animate-pulse" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-4 bg-muted rounded-lg animate-pulse" />
                  <div className="w-3/4 h-4 bg-muted rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-soft border border-border/50">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No posts yet</h3>
            <p className="text-muted-foreground">Be the first to share something with your community!</p>
          </div>
        ) : (
          <div className="space-y-4 stagger-children">
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
    </div>
  );
}
