import { useEffect, useRef, RefObject } from 'react';
import type MuxPlayerElement from '@mux/mux-player';

interface ScrollState {
  windowScrollY: number;
  containerScrollTop: number;
  scrollContainer: Element | null;
}

/**
 * Finds the nearest scrollable ancestor of an element.
 * Used to identify the correct scroll container to save/restore.
 */
function findScrollableAncestor(element: Element | null): Element | null {
  let current = element?.parentElement;
  
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight
    ) {
      return current;
    }
    current = current.parentElement;
  }
  
  return document.scrollingElement;
}

/**
 * Debug logger that only logs when running in Natively app.
 */
function nativelyLog(...args: unknown[]) {
  if (typeof window !== 'undefined' && 'natively' in window) {
    console.log('[FullscreenFix]', ...args);
  }
}

/**
 * Fixes iOS Safari/WebView bug where exiting fullscreen video causes content shift.
 * 
 * This enhanced version:
 * 1. Polls for the video element to ensure listeners attach even when ref updates after mount
 * 2. Saves/restores both window scroll and internal scroll container positions
 * 3. Uses multi-pass restoration to handle WKWebView timing quirks
 * 4. Dispatches events to refresh Natively safe-area insets after fullscreen exit
 */
export function useFullscreenScrollFix(playerRef: RefObject<MuxPlayerElement | null>) {
  const scrollStateRef = useRef<ScrollState>({
    windowScrollY: 0,
    containerScrollTop: 0,
    scrollContainer: null,
  });
  const listenersAttachedRef = useRef(false);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let pollIntervalId: ReturnType<typeof setInterval> | null = null;
    let pollTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let cleanupFunctions: (() => void)[] = [];

    const getVideoElement = (): HTMLVideoElement | null => {
      return playerRef.current?.media?.nativeEl ?? null;
    };

    const saveScrollState = () => {
      const videoEl = getVideoElement();
      const scrollContainer = findScrollableAncestor(videoEl);
      
      scrollStateRef.current = {
        windowScrollY: window.scrollY,
        containerScrollTop: scrollContainer?.scrollTop ?? 0,
        scrollContainer,
      };

      nativelyLog('Saved scroll state:', {
        windowScrollY: scrollStateRef.current.windowScrollY,
        containerScrollTop: scrollStateRef.current.containerScrollTop,
        containerTag: scrollContainer?.tagName,
      });
    };

    const restoreScrollState = () => {
      const { windowScrollY, containerScrollTop, scrollContainer } = scrollStateRef.current;

      nativelyLog('Restoring scroll state:', { windowScrollY, containerScrollTop });

      // Force viewport recalculation for iOS quirks
      document.body.style.height = '100.1%';

      const doRestore = () => {
        document.body.style.height = '';
        
        // Restore window scroll
        window.scrollTo(0, windowScrollY);
        
        // Restore internal container scroll
        if (scrollContainer) {
          scrollContainer.scrollTop = containerScrollTop;
        }
      };

      // Multi-pass restoration to handle WKWebView timing quirks
      requestAnimationFrame(doRestore);
      setTimeout(doRestore, 50);
      setTimeout(doRestore, 250);

      // Dispatch events to trigger inset refresh in NativelySafeAreaProvider
      setTimeout(() => {
        window.dispatchEvent(new Event('natively:refresh-insets'));
        window.dispatchEvent(new Event('resize'));
        nativelyLog('Dispatched refresh events');
      }, 100);
    };

    const handleFullscreenStart = () => {
      nativelyLog('Fullscreen started (webkit event)');
      saveScrollState();
    };

    const handleFullscreenEnd = () => {
      nativelyLog('Fullscreen ended (webkit event)');
      restoreScrollState();
    };

    const handleDocumentFullscreenChange = () => {
      if (!document.fullscreenElement) {
        nativelyLog('Fullscreen ended (standard event)');
        restoreScrollState();
      } else {
        nativelyLog('Fullscreen started (standard event)');
        saveScrollState();
      }
    };

    const attachListeners = (videoEl: HTMLVideoElement) => {
      if (listenersAttachedRef.current) return;
      
      listenersAttachedRef.current = true;
      videoElRef.current = videoEl;

      nativelyLog('Attaching fullscreen listeners to video element');

      // iOS-specific events
      videoEl.addEventListener('webkitbeginfullscreen', handleFullscreenStart);
      videoEl.addEventListener('webkitendfullscreen', handleFullscreenEnd);

      // Standard fullscreen event for non-iOS browsers
      document.addEventListener('fullscreenchange', handleDocumentFullscreenChange);

      cleanupFunctions.push(() => {
        videoEl.removeEventListener('webkitbeginfullscreen', handleFullscreenStart);
        videoEl.removeEventListener('webkitendfullscreen', handleFullscreenEnd);
        document.removeEventListener('fullscreenchange', handleDocumentFullscreenChange);
        nativelyLog('Removed fullscreen listeners');
      });
    };

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
        attachListeners(videoEl);
      }
    };

    // Try immediately
    const immediateVideoEl = getVideoElement();
    if (immediateVideoEl) {
      nativelyLog('Found native video element immediately');
      attachListeners(immediateVideoEl);
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
