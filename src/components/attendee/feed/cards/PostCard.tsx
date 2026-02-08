import { useState, useRef, useCallback, useEffect } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { PostCard as PostCardType } from '@/types/conferenceFeed';
import { Heart, MessageCircle, Share, Bookmark, Camera, Pin } from 'lucide-react';
import { HeartBurstAnimation } from '../HeartBurstAnimation';

interface PostCardProps {
  post: PostCardType;
  isActive: boolean;
  onLike: () => void;
  onBookmark: () => void;
}

export function PostCard({ post, isActive, onLike, onBookmark }: PostCardProps) {
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const muxPlayerRef = useRef<any>(null);

  // Handle video autoplay based on visibility
  useEffect(() => {
    const player = muxPlayerRef.current;
    if (!player) return;

    if (isActive) {
      player.play?.().catch(() => {});
    } else {
      player.pause?.();
    }
  }, [isActive]);

  // Double-tap detection
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap < 300) {
      // Double tap - trigger like
      if (!post.liked) {
        onLike();
      }
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 800);
    }
    setLastTap(now);
  }, [lastTap, post.liked, onLike]);

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  return (
    <div 
      className="relative h-full w-full bg-[#09090b] overflow-hidden"
      onClick={handleTap}
    >
      {/* Media Layer */}
      <div className="absolute inset-0">
        {post.type === 'video' || post.type === 'recap' ? (
          <MuxPlayer
            ref={muxPlayerRef}
            playbackId={post.playbackId}
            streamType="on-demand"
            autoPlay={false}
            muted
            loop
            playsInline
            className="w-full h-full [--controls:none] [--media-object-fit:cover]"
          />
        ) : (
          <img
            src={post.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Gradient Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 45%, transparent 100%)',
        }}
      />

      {/* Top Badges */}
      <div className="absolute top-16 left-4 right-4 flex justify-between items-start z-10">
        {/* Pinned Badge */}
        {post.isPinned && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm">
            <Pin className="w-3 h-3 text-white" />
            <span className="text-[11px] font-semibold text-white">Pinned</span>
          </div>
        )}
        
        {!post.isPinned && <div />}

        {/* Content Type Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm">
          {post.type === 'video' && (
            <>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-white">{post.videoDuration}</span>
            </>
          )}
          {post.type === 'photo' && (
            <>
              <Camera className="w-3 h-3 text-white" />
              <span className="text-[11px] font-semibold text-white">Photo</span>
            </>
          )}
          {post.type === 'recap' && (
            <span 
              className="text-[11px] font-bold"
              style={{ 
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ✦ AI RECAP
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons (Right Column) */}
      <div className="absolute right-3 bottom-36 flex flex-col items-center gap-5 z-10">
        {/* Like */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Heart 
              className={`w-5 h-5 ${post.liked ? 'fill-red-500 text-red-500' : 'text-white'}`}
            />
          </div>
          <span className="text-[10px] font-bold text-white">{formatCount(post.likes)}</span>
        </button>

        {/* Comment */}
        <button className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-bold text-white">{formatCount(post.comments)}</span>
        </button>

        {/* Share */}
        <button className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Share className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] font-bold text-white">{formatCount(post.shares)}</span>
        </button>

        {/* Bookmark */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBookmark();
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Bookmark 
              className={`w-5 h-5 ${post.bookmarked ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-white'}`}
            />
          </div>
          <span className="text-[10px] font-bold text-white">{formatCount(post.bookmarks)}</span>
        </button>
      </div>

      {/* Content Overlay (Bottom) */}
      <div className="absolute bottom-20 left-0 right-14 p-4 z-10">
        {/* Location/Session Tag */}
        <div 
          className="inline-flex items-center px-2.5 py-1 rounded-full mb-3"
          style={{ backgroundColor: `${post.tagColor}20` }}
        >
          <span 
            className="text-[11px] font-semibold"
            style={{ color: post.tagColor }}
          >
            {post.tag}
          </span>
        </div>

        {/* User Row */}
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: post.avatarBg }}
          >
            {post.avatar}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-white">{post.user}</span>
            {post.isOfficial && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#f59e0b] text-black">
                OFFICIAL
              </span>
            )}
            <span className="text-[13px] text-white/50">{post.handle}</span>
          </div>
        </div>

        {/* Caption */}
        <p 
          className="text-[14px] text-white leading-relaxed line-clamp-3 mb-2"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
        >
          {post.caption}
        </p>

        {/* Timestamp Row */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] text-white/70">
            {post.date} · {post.time}
          </span>
          <span className="text-[11px] text-white/50">{post.timeAgo}</span>
        </div>
      </div>

      {/* Heart Burst Animation */}
      {showHeartBurst && <HeartBurstAnimation />}
    </div>
  );
}
