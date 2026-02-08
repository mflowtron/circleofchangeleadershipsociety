import { Camera } from 'lucide-react';

export function FeedHeader() {
  return (
    <div 
      className="fixed top-0 left-0 right-0 z-30 pt-safe"
      style={{
        background: 'linear-gradient(to bottom, rgba(9,9,11,0.95) 0%, rgba(9,9,11,0.7) 70%, transparent 100%)',
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Camera Button */}
        <button className="w-[34px] h-[34px] rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
          <Camera className="w-[18px] h-[18px] text-white" />
        </button>

        {/* Centered Title */}
        <span className="text-[15px] font-extrabold text-white">Feed</span>

        {/* Empty space for balance */}
        <div className="w-[34px]" />
      </div>
    </div>
  );
}
