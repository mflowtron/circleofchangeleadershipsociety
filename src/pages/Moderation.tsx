import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useModerationPosts, FilterTab } from '@/hooks/useModerationPosts';
import { ModerationFilters } from '@/components/moderation/ModerationFilters';
import { ModerationPostCard } from '@/components/moderation/ModerationPostCard';

export default function Moderation() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const { posts, loading, scanning, stats, scanPost, approvePost, deletePost } = useModerationPosts(activeTab);

  // Calculate full stats (need to fetch all posts for accurate stats)
  const [allStats, setAllStats] = useState({ total: 0, flagged: 0, autoFlagged: 0, pending: 0 });
  
  // Use current filter stats for display
  const displayStats = activeTab === 'all' ? stats : allStats;

  // Effect to get full stats when not on 'all' tab
  useState(() => {
    if (activeTab === 'all') {
      setAllStats(stats);
    }
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Content Moderation</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Content Moderation</h1>
      </div>

      <ModerationFilters
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stats={activeTab === 'all' ? stats : { ...stats, total: posts.length }}
      />

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {activeTab === 'all'
                ? 'No posts to moderate.'
                : activeTab === 'flagged'
                ? 'No posts need review.'
                : 'No auto-flagged posts.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <ModerationPostCard
              key={post.id}
              post={post}
              scanning={scanning === post.id}
              onScan={() => scanPost(post)}
              onApprove={() => approvePost(post.id)}
              onDelete={() => deletePost(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
