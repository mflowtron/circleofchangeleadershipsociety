import { useReducer, useRef, useState, useEffect, useCallback } from 'react';
import { initialFeedData } from '@/data/conferenceFeedData';
import { FeedItem, FeedAction, isBlockingCard, isResolved, isPostCard, isAnnouncementCard, isPollCard, isVideoAskCard } from '@/types/conferenceFeed';
import { FeedItemViewState, createInitialViewState } from '@/types/feedViewState';
import { PostCard } from './cards/PostCard';
import { AnnouncementCard } from './cards/AnnouncementCard';
import { PollCard } from './cards/PollCard';
import { VideoAskCard } from './cards/VideoAskCard';
import { LoadingCard } from './cards/LoadingCard';
import { FeedHeader } from './FeedHeader';
import { ScrollDots } from './ScrollDots';
import { BottomNavigation } from '../BottomNavigation';
import { FeedCommentsSheet } from './FeedCommentsSheet';
import { useAttendeeEvent } from '@/contexts/AttendeeEventContext';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

// Constants for infinite queue
const LOAD_THRESHOLD = 4;
const BATCH_SIZE = 6;
const MIN_INTERSTITIAL_GAP = 4;

// Queue item wraps FeedItem with instance-specific data
interface QueueItem {
  item: FeedItem;
  instanceId: string; // Unique ID for this queue position
}

function feedReducer(state: FeedItem[], action: FeedAction): FeedItem[] {
  return state.map((item) => {
    if (item.id !== action.id) return item;

    switch (action.type) {
      case "ACKNOWLEDGE_ANNOUNCEMENT":
        if (isAnnouncementCard(item)) {
          return { ...item, acknowledged: true };
        }
        return item;

      case "VOTE_POLL":
        if (isPollCard(item)) {
          return {
            ...item,
            answered: true,
            selectedOption: action.optionId,
            totalVotes: item.totalVotes + 1,
            options: item.options.map((opt) =>
              opt.id === action.optionId ? { ...opt, votes: opt.votes + 1 } : opt
            ),
          };
        }
        return item;

      case "RESPOND_VIDEOASK":
      case "SKIP_VIDEOASK":
        if (isVideoAskCard(item)) {
          return { ...item, responded: true };
        }
        return item;

      case "TOGGLE_LIKE":
        if (isPostCard(item)) {
          return {
            ...item,
            liked: !item.liked,
            likes: item.liked ? item.likes - 1 : item.likes + 1,
          };
        }
        return item;

      case "UPDATE_COMMENT_COUNT":
        if (isPostCard(item) && 'delta' in action) {
          return {
            ...item,
            comments: Math.max(0, item.comments + (action as any).delta),
          };
        }
        return item;

      default:
        return item;
    }
  });
}

export function ConferenceFeed() {
  const [feedItems, dispatch] = useReducer(feedReducer, initialFeedData);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [viewStates, setViewStates] = useState<Map<string, FeedItemViewState>>(new Map());
  const [renderedQueue, setRenderedQueue] = useState<QueueItem[]>([]);
  const [instanceCounter, setInstanceCounter] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevActiveIndexRef = useRef(0);

  // Get event context for comments - may not be available
  let eventId: string | null = null;
  let attendeeId: string | null = null;
  try {
    const eventContext = useAttendeeEvent();
    eventId = eventContext?.selectedEvent?.id || null;
    attendeeId = eventContext?.selectedAttendee?.id || null;
  } catch {
    // Context not available, comments will be disabled
  }

  // Helper to generate unique instance IDs
  const generateInstanceId = useCallback(() => {
    setInstanceCounter(prev => prev + 1);
    return `instance-${instanceCounter}-${Date.now()}`;
  }, [instanceCounter]);

  // Build initial queue on mount
  useEffect(() => {
    const initialQueue: QueueItem[] = feedItems.map((item, idx) => ({
      item,
      instanceId: `initial-${idx}`,
    }));
    setRenderedQueue(initialQueue);
  }, []); // Only run once on mount

  // Helper to check if an item is an interstitial
  const isInterstitial = useCallback((item: FeedItem) => {
    return isBlockingCard(item);
  }, []);

  // Build next batch function
  const buildNextBatch = useCallback((count: number): QueueItem[] => {
    const batch: QueueItem[] = [];
    const usedIds = new Set<string>();
    let interstitialGap = 0;

    // Check last items in queue for gap calculation
    for (let i = renderedQueue.length - 1; i >= 0 && i >= renderedQueue.length - MIN_INTERSTITIAL_GAP; i--) {
      const queueItem = renderedQueue[i];
      if (queueItem && isInterstitial(queueItem.item)) {
        interstitialGap = renderedQueue.length - 1 - i;
        break;
      }
      interstitialGap = renderedQueue.length - i;
    }

    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

    const tryAdd = (item: FeedItem, isResurface: boolean = false): boolean => {
      if (usedIds.has(item.id)) return false;
      if (batch.length >= count) return false;

      const isInter = isInterstitial(item);
      if (isInter && interstitialGap < MIN_INTERSTITIAL_GAP) return false;

      // For resurfaced interstitials, increment nudge level
      if (isResurface) {
        const state = viewStates.get(item.id);
        if (state) {
          setViewStates(prev => {
            const next = new Map(prev);
            next.set(item.id, { 
              ...state, 
              nudgeLevel: Math.min(3, (state.nudgeLevel || 0) + 1) as 0 | 1 | 2 | 3, 
              skippedAt: null 
            });
            return next;
          });
        }
      }

      batch.push({ 
        item, 
        instanceId: `batch-${Date.now()}-${batch.length}-${Math.random().toString(36).slice(2)}` 
      });
      usedIds.add(item.id);
      interstitialGap = isInter ? 0 : interstitialGap + 1;
      return true;
    };

    // Priority 1: Unseen content
    const unseen = feedItems.filter(item => {
      const state = viewStates.get(item.id);
      return !state || state.viewCount === 0;
    });

    // Priority 2: Skipped interstitials that haven't been interacted with (nudgeLevel < 3)
    const skippedInterstitials = feedItems.filter(item => {
      if (!isInterstitial(item)) return false;
      const state = viewStates.get(item.id);
      return state?.skippedAt && !state.interacted && (state.nudgeLevel || 0) < 3;
    });

    // Priority 3: Previously seen regular posts for replay
    const replayable = feedItems.filter(item => {
      const state = viewStates.get(item.id);
      if (!state || state.viewCount === 0) return false;
      if (isInterstitial(item)) return false;
      return true;
    });

    // Sort replayable by engagement
    const sortedReplayable = [...replayable].sort((a, b) => {
      const aLiked = isPostCard(a) && a.liked ? 1 : 0;
      const bLiked = isPostCard(b) && b.liked ? 1 : 0;
      if (aLiked !== bLiked) return bLiked - aLiked;
      const aLikes = isPostCard(a) ? a.likes : 0;
      const bLikes = isPostCard(b) ? b.likes : 0;
      return bLikes - aLikes;
    });

    // Fill the batch
    for (const item of shuffle(unseen)) tryAdd(item);
    for (const item of shuffle(skippedInterstitials)) tryAdd(item, true);
    for (const item of sortedReplayable) tryAdd(item);

    // If still need more, shuffle replayable
    if (batch.length < count) {
      for (const item of shuffle(sortedReplayable)) tryAdd(item);
    }

    return batch;
  }, [feedItems, viewStates, renderedQueue, isInterstitial]);

  // Load more when approaching end
  useEffect(() => {
    if (renderedQueue.length === 0) return;
    
    if (activeIndex >= renderedQueue.length - LOAD_THRESHOLD) {
      const nextBatch = buildNextBatch(BATCH_SIZE);
      if (nextBatch.length > 0) {
        setRenderedQueue(prev => [...prev, ...nextBatch]);
      }
    }
  }, [activeIndex, renderedQueue.length, buildNextBatch]);

  // Update view state when active card changes
  useEffect(() => {
    const currentQueueItem = renderedQueue[activeIndex];
    if (!currentQueueItem) return;

    const itemId = currentQueueItem.item.id;
    setViewStates(prev => {
      const next = new Map(prev);
      const existing = next.get(itemId) || createInitialViewState();
      next.set(itemId, {
        ...existing,
        viewCount: existing.viewCount + 1,
        lastViewedAt: Date.now(),
      });
      return next;
    });
  }, [activeIndex, renderedQueue]);

  // Detect skipped interstitials
  useEffect(() => {
    const prevIndex = prevActiveIndexRef.current;
    const prevQueueItem = renderedQueue[prevIndex];
    
    if (prevQueueItem && activeIndex > prevIndex) {
      const prevItem = prevQueueItem.item;
      const isInter = isInterstitial(prevItem);
      const state = viewStates.get(prevItem.id);
      
      if (isInter && !state?.interacted && !isResolved(prevItem)) {
        setViewStates(prev => {
          const next = new Map(prev);
          const existing = next.get(prevItem.id);
          if (existing && !existing.skippedAt) {
            next.set(prevItem.id, { ...existing, skippedAt: Date.now() });
          }
          return next;
        });
      }
    }
    
    prevActiveIndexRef.current = activeIndex;
  }, [activeIndex, renderedQueue, viewStates, isInterstitial]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const handleOpenComments = useCallback((postId: string) => {
    setCommentsPostId(postId);
  }, []);

  const handleCloseComments = useCallback(() => {
    setCommentsPostId(null);
  }, []);

  const handleCommentCountChange = useCallback((postId: string, delta: number) => {
    dispatch({ type: "UPDATE_COMMENT_COUNT", id: postId, delta });
  }, []);

  // Mark item as interacted
  const markInteracted = useCallback((id: string) => {
    setViewStates(prev => {
      const next = new Map(prev);
      const existing = next.get(id);
      if (existing) {
        next.set(id, { ...existing, interacted: true });
      } else {
        next.set(id, { ...createInitialViewState(), interacted: true });
      }
      return next;
    });
  }, []);

  // Set up intersection observer to track active card
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const index = cardRefs.current.findIndex((ref) => ref === entry.target);
            if (index !== -1) {
              setActiveIndex(index);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.6,
      }
    );

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [renderedQueue.length]);

  const handleAcknowledge = (id: string) => {
    dispatch({ type: "ACKNOWLEDGE_ANNOUNCEMENT", id });
    markInteracted(id);
  };

  const handleVote = (id: string, optionId: string) => {
    dispatch({ type: "VOTE_POLL", id, optionId });
    markInteracted(id);
  };

  const handleVideoAskRespond = (id: string) => {
    dispatch({ type: "RESPOND_VIDEOASK", id });
    markInteracted(id);
  };

  const handleVideoAskSkip = (id: string) => {
    dispatch({ type: "SKIP_VIDEOASK", id });
    markInteracted(id);
  };

  const handleLike = (id: string) => {
    dispatch({ type: "TOGGLE_LIKE", id });
    // Note: liking doesn't count as "interacted" for interstitial logic
  };

  // Get the current state of an item from feedItems (which has the updated state)
  const getCurrentItem = useCallback((originalItem: FeedItem): FeedItem => {
    return feedItems.find(item => item.id === originalItem.id) || originalItem;
  }, [feedItems]);

  const renderCard = (queueItem: QueueItem, index: number) => {
    const isActive = index === activeIndex;
    const item = getCurrentItem(queueItem.item);
    const nudgeLevel = viewStates.get(item.id)?.nudgeLevel || 0;

    if (isPostCard(item)) {
      return (
        <PostCard
          key={queueItem.instanceId}
          post={item}
          isActive={isActive}
          isMuted={isMuted}
          onLike={() => handleLike(item.id)}
          onToggleMute={handleToggleMute}
          onOpenComments={() => handleOpenComments(item.id)}
        />
      );
    }

    if (isAnnouncementCard(item)) {
      return (
        <AnnouncementCard
          key={queueItem.instanceId}
          announcement={item}
          nudgeLevel={nudgeLevel}
          onAcknowledge={() => handleAcknowledge(item.id)}
        />
      );
    }

    if (isPollCard(item)) {
      return (
        <PollCard
          key={queueItem.instanceId}
          poll={item}
          nudgeLevel={nudgeLevel}
          onVote={(optionId) => handleVote(item.id, optionId)}
        />
      );
    }

    if (isVideoAskCard(item)) {
      return (
        <VideoAskCard
          key={queueItem.instanceId}
          videoAsk={item}
          nudgeLevel={nudgeLevel}
          onRespond={() => handleVideoAskRespond(item.id)}
          onSkip={() => handleVideoAskSkip(item.id)}
        />
      );
    }

    return null;
  };

  const handleCreatePost = () => {
    toast.info('Create post coming soon!');
  };

  // Extract items for ScrollDots
  const queueItems = renderedQueue.map(q => getCurrentItem(q.item));

  return (
    <div className="feed-dark fixed inset-0 bg-[#09090b] overflow-hidden">
      {/* Feed Header */}
      <FeedHeader />

      {/* Scroll Container */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {renderedQueue.map((queueItem, index) => (
          <div
            key={queueItem.instanceId}
            ref={(el) => (cardRefs.current[index] = el)}
            className="h-full w-full snap-start snap-always flex-shrink-0"
            style={{ scrollSnapStop: 'always' }}
          >
            {renderCard(queueItem, index)}
          </div>
        ))}
        
        {/* Loading Card at the end */}
        <div
          ref={(el) => (cardRefs.current[renderedQueue.length] = el)}
          className="h-full w-full snap-start snap-always flex-shrink-0"
          style={{ scrollSnapStop: 'always' }}
        >
          <LoadingCard />
        </div>
      </div>

      {/* Scroll Dots */}
      <ScrollDots
        items={queueItems}
        activeIndex={activeIndex}
        totalCount={renderedQueue.length + 1}
      />

      {/* Floating Action Button */}
      <button
        onClick={handleCreatePost}
        className="fixed right-4 z-40 w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center touch-manipulation active:scale-95 transition-transform opacity-0 animate-fab-pop-in"
        style={{ bottom: 'calc(max(env(safe-area-inset-bottom), var(--natively-safe-area-bottom, 0px)) + 80px)' }}
        aria-label="Create post"
      >
        <Plus className="h-6 w-6 text-primary-foreground" />
      </button>

      {/* Bottom Navigation */}
      <div className="feed-dark">
        <BottomNavigation />
      </div>

      {/* Hide scrollbar styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Comments Sheet */}
      <FeedCommentsSheet
        isOpen={commentsPostId !== null}
        onClose={handleCloseComments}
        postId={commentsPostId}
        eventId={eventId}
        currentAttendeeId={attendeeId}
        commentCount={
          commentsPostId
            ? (feedItems.find(i => i.id === commentsPostId && isPostCard(i)) as any)?.comments || 0
            : 0
        }
        onCommentCountChange={handleCommentCountChange}
      />
    </div>
  );
}
