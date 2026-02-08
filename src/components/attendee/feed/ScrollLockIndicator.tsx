interface ScrollLockIndicatorProps {
  isVisible: boolean;
}

export function ScrollLockIndicator({ isVisible }: ScrollLockIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed bottom-24 left-1/2 -translate-x-1/2 pointer-events-none"
      style={{ zIndex: 25 }}
    >
      {/* Inner wrapper gets the animation - keeps centering and animation separate */}
      <div className="animate-slide-up">
        <div 
          className="px-4 py-2 rounded-full"
          style={{
            backgroundColor: 'rgba(239,68,68,0.1)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(239,68,68,0.15)',
          }}
        >
          <span 
            className="text-[11px] font-bold"
            style={{ color: '#fca5a5' }}
          >
            🔒 Scroll locked — interact to continue
          </span>
        </div>
      </div>
    </div>
  );
}
