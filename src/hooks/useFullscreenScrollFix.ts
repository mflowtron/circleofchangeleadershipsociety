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
 * Aggressive viewport reset for iOS WKWebView fullscreen exit issues.
 * This handles cases where visualViewport.offsetTop becomes non-zero.
 */
function resetViewport() {
  nativelyLog('Executing aggressive viewport reset');

  // Force a reflow by toggling overflow
  const html = document.documentElement;
  const originalOverflow = html.style.overflow;
  html.style.overflow = 'hidden';
  void html.offsetHeight; // Force reflow
  html.style.overflow = originalOverflow;

  // Reset all scroll positions
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  // Find and reset any scrollable containers
  const scrollContainers = document.querySelectorAll('[class*="overflow-y-auto"], [class*="overflow-auto"]');
  scrollContainers.forEach((container) => {
    if (container instanceof HTMLElement) {
      container.scrollTop = 0;
    }
  });

  // Check visualViewport offset and try to compensate
  const vv = window.visualViewport;
  if (vv && vv.offsetTop > 0) {
    nativelyLog('visualViewport.offsetTop detected:', vv.offsetTop);
    // Try negative scroll to compensate
    window.scrollTo(0, -vv.offsetTop);
  }

  // Dispatch events to refresh Natively insets
  window.dispatchEvent(new Event('natively:refresh-insets'));
  window.dispatchEvent(new Event('resize'));
}

/**
 * Multi-pass reset to handle WKWebView async timing quirks.
 */
function multiPassReset() {
  // Immediate
  resetViewport();
  
  // Delayed passes
  setTimeout(resetViewport, 50);
  setTimeout(resetViewport, 200);
  setTimeout(resetViewport, 500);
}

/**
 * Fixes iOS Safari/WebView bug where exiting fullscreen video causes content shift.
 * 
 * This enhanced version:
 * 1. Monitors visualViewport.offsetTop for anomalies
 * 2. Listens to multiple event sources (webkit, standard, visibility, viewport)
 * 3. Performs aggressive DOM reset with multi-pass timing
 * 4. Uses a sentinel element to detect viewport misalignment
 */
export function useFullscreenScrollFix(playerRef: RefObject<MuxPlayerElement | null>) {
  const wasInFullscreenRef = useRef(false);
  const listenersAttachedRef = useRef(false);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Only run in Natively app
    if (typeof window === 'undefined' || !('natively' in window)) {
      return;
    }

    let pollIntervalId: ReturnType<typeof setInterval> | null = null;
    let pollTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const cleanupFunctions: (() => void)[] = [];

    // Create sentinel element to detect viewport misalignment
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;pointer-events:none;visibility:hidden;';
    document.body.appendChild(sentinel);
    sentinelRef.current = sentinel;
    cleanupFunctions.push(() => {
      sentinel.remove();
      sentinelRef.current = null;
    });

    const checkSentinel = (): boolean => {
      if (!sentinelRef.current) return false;
      const rect = sentinelRef.current.getBoundingClientRect();
      const misaligned = rect.top !== 0;
      if (misaligned) {
        nativelyLog('Sentinel detected misalignment:', rect.top);
      }
      return misaligned;
    };

    const getVideoElement = (): HTMLVideoElement | null => {
      return playerRef.current?.media?.nativeEl ?? null;
    };

    const handleFullscreenStart = () => {
      nativelyLog('Fullscreen started');
      wasInFullscreenRef.current = true;
    };

    const handleFullscreenEnd = () => {
      nativelyLog('Fullscreen ended - triggering reset');
      if (wasInFullscreenRef.current) {
        wasInFullscreenRef.current = false;
        multiPassReset();
      }
    };

    // Handle visualViewport changes
    const handleViewportResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;

      // Check if we just exited fullscreen and have an offset
      if (vv.offsetTop > 10 || checkSentinel()) {
        nativelyLog('Viewport anomaly detected after resize, offsetTop:', vv.offsetTop);
        multiPassReset();
      }
    };

    // Handle visibility changes (fullscreen exit can trigger this)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wasInFullscreenRef.current) {
        nativelyLog('Visibility restored after fullscreen');
        wasInFullscreenRef.current = false;
        multiPassReset();
      }
    };

    // Handle standard fullscreen change
    const handleDocumentFullscreenChange = () => {
      if (document.fullscreenElement) {
        handleFullscreenStart();
      } else {
        handleFullscreenEnd();
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
    window.visualViewport?.addEventListener('resize', handleViewportResize);

    cleanupFunctions.push(() => {
      document.removeEventListener('fullscreenchange', handleDocumentFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
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
