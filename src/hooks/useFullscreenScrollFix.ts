import { useEffect, useRef, RefObject } from 'react';
import type MuxPlayerElement from '@mux/mux-player';

/**
 * Debug logger that only logs when running in Natively app.
 */
function nativelyLog(...args: unknown[]) {
  if (typeof window !== 'undefined' && 'natively' in window) {
    console.log('[FullscreenFix]', ...args);
  }
}

/**
 * Dispatches fullscreen exit event for the NativelySafeAreaProvider to handle.
 */
function dispatchFullscreenExit() {
  nativelyLog('Dispatching fullscreen exit events');
  window.dispatchEvent(new Event('natively:fullscreen-exit'));
  window.dispatchEvent(new Event('natively:refresh-insets'));
}

/**
 * Minimal scroll reset - just resets to top without negative offsets.
 */
function resetScroll() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/**
 * Hook to detect fullscreen exit and signal the NativelySafeAreaProvider.
 * 
 * The actual viewport compensation is handled by NativelySafeAreaProvider.
 * This hook's job is just to detect fullscreen exit from multiple sources
 * and dispatch the appropriate events.
 */
export function useFullscreenScrollFix(playerRef: RefObject<MuxPlayerElement | null>) {
  const wasInFullscreenRef = useRef(false);
  const listenersAttachedRef = useRef(false);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Only run in Natively app
    if (typeof window === 'undefined' || !('natively' in window)) {
      return;
    }

    let pollIntervalId: ReturnType<typeof setInterval> | null = null;
    let pollTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const cleanupFunctions: (() => void)[] = [];

    const getVideoElement = (): HTMLVideoElement | null => {
      return playerRef.current?.media?.nativeEl ?? null;
    };

    const handleFullscreenStart = () => {
      nativelyLog('Fullscreen started');
      wasInFullscreenRef.current = true;
    };

    const handleFullscreenEnd = () => {
      nativelyLog('Fullscreen ended (webkit event)');
      if (wasInFullscreenRef.current) {
        wasInFullscreenRef.current = false;
        resetScroll();
        dispatchFullscreenExit();
      }
    };

    // Handle standard fullscreen change
    const handleDocumentFullscreenChange = () => {
      if (document.fullscreenElement) {
        handleFullscreenStart();
      } else if (wasInFullscreenRef.current) {
        nativelyLog('Fullscreen ended (standard event)');
        wasInFullscreenRef.current = false;
        resetScroll();
        dispatchFullscreenExit();
      }
    };

    // Handle visibility changes (fullscreen exit can trigger this)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wasInFullscreenRef.current) {
        nativelyLog('Visibility restored after fullscreen');
        wasInFullscreenRef.current = false;
        resetScroll();
        dispatchFullscreenExit();
      }
    };

    const attachVideoListeners = (videoEl: HTMLVideoElement) => {
      if (listenersAttachedRef.current) return;
      
      listenersAttachedRef.current = true;
      videoElRef.current = videoEl;

      nativelyLog('Attaching fullscreen listeners to video element');

      // iOS-specific events
      videoEl.addEventListener('webkitbeginfullscreen', handleFullscreenStart);
      videoEl.addEventListener('webkitendfullscreen', handleFullscreenEnd);

      cleanupFunctions.push(() => {
        videoEl.removeEventListener('webkitbeginfullscreen', handleFullscreenStart);
        videoEl.removeEventListener('webkitendfullscreen', handleFullscreenEnd);
        nativelyLog('Removed video fullscreen listeners');
      });
    };

    // Attach global listeners
    document.addEventListener('fullscreenchange', handleDocumentFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    cleanupFunctions.push(() => {
      document.removeEventListener('fullscreenchange', handleDocumentFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    });

    // Poll for video element
    const pollForVideoElement = () => {
      const videoEl = getVideoElement();
      
      if (videoEl) {
        nativelyLog('Found native video element via polling');
        if (pollIntervalId) {
          clearInterval(pollIntervalId);
          pollIntervalId = null;
        }
        if (pollTimeoutId) {
          clearTimeout(pollTimeoutId);
          pollTimeoutId = null;
        }
        attachVideoListeners(videoEl);
      }
    };

    // Try immediately
    const immediateVideoEl = getVideoElement();
    if (immediateVideoEl) {
      nativelyLog('Found native video element immediately');
      attachVideoListeners(immediateVideoEl);
    } else {
      // Poll every 100ms for up to 5 seconds
      nativelyLog('Video element not ready, starting poll');
      pollIntervalId = setInterval(pollForVideoElement, 100);
      pollTimeoutId = setTimeout(() => {
        if (pollIntervalId) {
          clearInterval(pollIntervalId);
          pollIntervalId = null;
        }
        nativelyLog('Polling timed out - video element never found');
      }, 5000);
    }

    return () => {
      if (pollIntervalId) clearInterval(pollIntervalId);
      if (pollTimeoutId) clearTimeout(pollTimeoutId);
      cleanupFunctions.forEach(fn => fn());
      listenersAttachedRef.current = false;
      videoElRef.current = null;
    };
  }, [playerRef]);
}
