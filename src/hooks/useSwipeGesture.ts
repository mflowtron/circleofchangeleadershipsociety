import { useEffect, useRef } from 'react';

interface UseSwipeGestureOptions {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  edgeWidth?: number;
  threshold?: number;
}

export function useSwipeGesture({
  onSwipeRight,
  onSwipeLeft,
  edgeWidth = 30,
  threshold = 80,
}: UseSwipeGestureOptions) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isEdgeSwipe = useRef(false);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      
      // Check if touch started from left edge
      isEdgeSwipe.current = touch.clientX <= edgeWidth;
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Prevent default back gesture when swiping from edge
      if (isEdgeSwipe.current && touchStartX.current !== null) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartX.current;
        const deltaY = Math.abs(touch.clientY - (touchStartY.current || 0));
        
        // Only prevent if horizontal swipe (not scrolling)
        if (deltaX > 20 && deltaY < 50) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      // Only trigger if horizontal movement is greater than vertical
      if (Math.abs(deltaX) > deltaY) {
        // Swipe right from left edge
        if (isEdgeSwipe.current && deltaX > threshold && onSwipeRight) {
          onSwipeRight();
        }
        // Swipe left from right edge (for closing)
        else if (touchStartX.current > window.innerWidth - edgeWidth && deltaX < -threshold && onSwipeLeft) {
          onSwipeLeft();
        }
      }

      touchStartX.current = null;
      touchStartY.current = null;
      isEdgeSwipe.current = false;
    };

    // Use passive: false to allow preventDefault
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeRight, onSwipeLeft, edgeWidth, threshold]);
}
