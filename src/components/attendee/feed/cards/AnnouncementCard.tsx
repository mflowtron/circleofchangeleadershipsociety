import { AnnouncementCard as AnnouncementCardType } from '@/types/conferenceFeed';
import { Lock, Check } from 'lucide-react';

interface AnnouncementCardProps {
  announcement: AnnouncementCardType;
  onAcknowledge: () => void;
}

export function AnnouncementCard({ announcement, onAcknowledge }: AnnouncementCardProps) {
  const isImportant = announcement.priority === 'important';

  return (
    <div className="relative h-full w-full bg-[#09090b] overflow-hidden flex items-center justify-center">
      {/* Background Effects */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${announcement.accentColor}15 0%, transparent 70%)`,
        }}
      />
      {/* Subtle scanline texture */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[340px] mx-auto px-6 animate-slide-up">
        {/* Icon */}
        <div 
          className="w-[72px] h-[72px] rounded-[20px] flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: `${announcement.accentColor}20` }}
        >
          <span className="text-4xl">{announcement.emoji}</span>
        </div>

        {/* Priority Badge */}
        <div className="flex justify-center mb-4">
          <div 
            className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: isImportant ? '#ef444420' : `${announcement.accentColor}20`,
              color: isImportant ? '#ef4444' : announcement.accentColor,
            }}
          >
            {isImportant ? '⚠ Important Update' : 'ℹ Announcement'}
          </div>
        </div>

        {/* Title */}
        <h2 
          className="text-[22px] font-black text-center text-[#f0f0f2] mb-4"
          style={{ fontFamily: 'Figtree, sans-serif' }}
        >
          {announcement.title}
        </h2>

        {/* Body */}
        <p className="text-[14px] text-center text-[#a1a1aa] leading-relaxed mb-6">
          {announcement.body}
        </p>

        {/* Source + Time */}
        <p className="text-[11px] text-center text-white/30 mb-6">
          {announcement.from} · {announcement.date} · {announcement.time}
        </p>

        {/* Got it Button */}
        {!announcement.acknowledged ? (
          <>
            <button
              onClick={onAcknowledge}
              className="w-full py-3.5 rounded-[14px] text-[14px] font-extrabold text-white transition-all hover:opacity-90"
              style={{
                background: `linear-gradient(135deg, ${announcement.accentColor} 0%, ${announcement.accentColor}dd 100%)`,
                boxShadow: `0 4px 20px -4px ${announcement.accentColor}50`,
              }}
            >
              Got it ✓
            </button>

            {/* Lock Hint */}
            <div className="flex items-center justify-center gap-1.5 mt-4">
              <Lock className="w-3 h-3 text-white/30" />
              <span className="text-[11px] text-white/30">
                Acknowledge to continue scrolling
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center gap-2 py-3">
            <Check className="w-5 h-5 text-green-500" />
            <span className="text-[14px] font-semibold text-green-500">Acknowledged</span>
          </div>
        )}
      </div>

      {/* Slide-up animation */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
