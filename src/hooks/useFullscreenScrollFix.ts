import { useEffect, useRef, RefObject } from 'react';
import type MuxPlayerElement from '@mux/mux-player';

/**
 * Fixes iOS Safari/WebView bug where exiting fullscreen video causes content shift.
 * Saves scroll position before fullscreen and restores it after exit.
 */
export function useFullscreenScrollFix(playerRef: RefObject<MuxPlayerElement | null>) {
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    const getVideoElement = () => playerRef.current?.media?.nativeEl;

    const handleFullscreenStart = () => {
      scrollPositionRef.current = window.scrollY;
    };

    const handleFullscreenEnd = () => {
      // Force viewport recalculation for iOS quirks
      document.body.style.height = '100.1%';
      requestAnimationFrame(() => {
        document.body.style.height = '';
        window.scrollTo(0, scrollPositionRef.current);
      });
    };

    const handleDocumentFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleFullscreenEnd();
      } else {
        handleFullscreenStart();
      }
    };

    // Attach listeners once video element is available
    const videoEl = getVideoElement();
    if (videoEl) {
      // iOS-specific events
      videoEl.addEventListener('webkitbeginfullscreen', handleFullscreenStart);
      videoEl.addEventListener('webkitendfullscreen', handleFullscreenEnd);
    }

    // Standard fullscreen event for non-iOS browsers
    document.addEventListener('fullscreenchange', handleDocumentFullscreenChange);

    return () => {
      const videoEl = getVideoElement();
      if (videoEl) {
        videoEl.removeEventListener('webkitbeginfullscreen', handleFullscreenStart);
        videoEl.removeEventListener('webkitendfullscreen', handleFullscreenEnd);
      }
      document.removeEventListener('fullscreenchange', handleDocumentFullscreenChange);
    };
  }, [playerRef]);
}
