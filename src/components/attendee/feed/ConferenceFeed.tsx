import { useReducer, useRef, useState, useEffect, useCallback } from 'react';
import { initialFeedData } from '@/data/conferenceFeedData';
import { FeedItem, FeedAction, isBlockingCard, isResolved, isPostCard, isAnnouncementCard, isPollCard, isVideoAskCard } from '@/types/conferenceFeed';
import { PostCard } from './cards/PostCard';
import { AnnouncementCard } from './cards/AnnouncementCard';
import { PollCard } from './cards/PollCard';
import { VideoAskCard } from './cards/VideoAskCard';
import { FeedHeader } from './FeedHeader';
import { ScrollDots } from './ScrollDots';
import { ScrollLockIndicator } from './ScrollLockIndicator';
import { EndOfFeedCard } from './EndOfFeedCard';
import { BottomNavigation } from '../BottomNavigation';
import { FeedCommentsSheet } from './FeedCommentsSheet';
import { useAttendeeEvent } from '@/contexts/AttendeeEventContext';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

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
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  // Calculate if current card is blocked
  useEffect(() => {
    const currentItem = feedItems[activeIndex];
    if (currentItem && isBlockingCard(currentItem) && !isResolved(currentItem)) {
      setIsBlocked(true);
    } else {
      setIsBlocked(false);
    }
  }, [activeIndex, feedItems]);

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
  }, [feedItems.length]);

  // Handle scroll blocking
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const currentItem = feedItems[activeIndex];
    const shouldBlock = currentItem && isBlockingCard(currentItem) && !isResolved(currentItem);

    if (shouldBlock) {
      const cardHeight = containerRef.current.clientHeight;
      const targetScrollTop = activeIndex * cardHeight;
      containerRef.current.scrollTop = targetScrollTop;
    }
  }, [activeIndex, feedItems]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Auto-advance after interaction
  const autoAdvance = useCallback(() => {
    if (!containerRef.current) return;
    
    const cardHeight = containerRef.current.clientHeight;
    const nextIndex = activeIndex + 1;
    
    if (nextIndex < feedItems.length + 1) { // +1 for end card
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: nextIndex * cardHeight,
          behavior: 'smooth',
        });
      }, 600);
    }
  }, [activeIndex, feedItems.length]);

  const handleAcknowledge = (id: string) => {
    dispatch({ type: "ACKNOWLEDGE_ANNOUNCEMENT", id });
    autoAdvance();
  };

  const handleVote = (id: string, optionId: string) => {
    dispatch({ type: "VOTE_POLL", id, optionId });
    // Delay auto-advance to let animation play
    setTimeout(autoAdvance, 1200);
  };

  const handleVideoAskRespond = (id: string) => {
    dispatch({ type: "RESPOND_VIDEOASK", id });
    setTimeout(autoAdvance, 1500);
  };

  const handleVideoAskSkip = (id: string) => {
    dispatch({ type: "SKIP_VIDEOASK", id });
    autoAdvance();
  };

  const handleLike = (id: string) => {
    dispatch({ type: "TOGGLE_LIKE", id });
  };

  const renderCard = (item: FeedItem, index: number) => {
    const isActive = index === activeIndex;

    if (isPostCard(item)) {
      return (
        <PostCard
          key={item.id}
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
          key={item.id}
          announcement={item}
          onAcknowledge={() => handleAcknowledge(item.id)}
        />
      );
    }

    if (isPollCard(item)) {
      return (
        <PollCard
          key={item.id}
          poll={item}
          onVote={(optionId) => handleVote(item.id, optionId)}
        />
      );
    }

    if (isVideoAskCard(item)) {
      return (
        <VideoAskCard
          key={item.id}
          videoAsk={item}
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
        {feedItems.map((item, index) => (
          <div
            key={item.id}
            ref={(el) => (cardRefs.current[index] = el)}
            className="h-full w-full snap-start snap-always flex-shrink-0"
            style={{ scrollSnapStop: 'always' }}
          >
            {renderCard(item, index)}
          </div>
        ))}
        
        {/* End of Feed Card */}
        <div
          ref={(el) => (cardRefs.current[feedItems.length] = el)}
          className="h-full w-full snap-start snap-always flex-shrink-0"
          style={{ scrollSnapStop: 'always' }}
        >
          <EndOfFeedCard />
        </div>
      </div>

      {/* Scroll Dots */}
      <ScrollDots
        items={feedItems}
        activeIndex={activeIndex}
        totalCount={feedItems.length + 1}
      />

      {/* Scroll Lock Indicator */}
      <ScrollLockIndicator isVisible={isBlocked} />

      {/* Floating Action Button */}
      <button
        onClick={handleCreatePost}
        className="fixed right-4 z-40 w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
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
