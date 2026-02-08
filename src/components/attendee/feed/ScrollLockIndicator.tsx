interface ScrollLockIndicatorProps {
  isVisible: boolean;
}

export function ScrollLockIndicator({ isVisible }: ScrollLockIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-25 pointer-events-none animate-slide-up"
      style={{ zIndex: 25 }}
    >
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

      <style>{`
        @keyframes slide-up-indicator {
          from {
            opacity: 0;
            transform: translate(-50%, 10px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-slide-up {
          animation: slide-up-indicator 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
