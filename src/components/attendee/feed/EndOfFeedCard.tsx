import { Plus } from 'lucide-react';

export function EndOfFeedCard() {
  return (
    <div className="h-full w-full bg-[#09090b] flex flex-col items-center justify-center px-8">
      {/* Emoji */}
      <span className="text-5xl mb-4">✨</span>

      {/* Title */}
      <h2 
        className="text-[18px] font-extrabold text-[#f0f0f2] mb-2 text-center"
        style={{ fontFamily: 'Figtree, sans-serif' }}
      >
        You're all caught up!
      </h2>

      {/* Subtitle */}
      <p className="text-[13px] text-[#a1a1aa] text-center mb-8">
        Check back later for more moments from the conference.
      </p>

      {/* CTA Button */}
      <button
        className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold"
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: '#000',
        }}
      >
        <Plus className="w-4 h-4" />
        Share a moment
      </button>
    </div>
  );
}
