'use client';

import { useEffect, useRef } from 'react';
import { NativelyInfo, useNatively } from 'natively';

/**
 * Debug logger that only logs when running in Natively app.
 */
function nativelyLog(...args: unknown[]) {
  if (typeof window !== 'undefined' && 'natively' in window) {
    console.log('[FullscreenLayoutFix]', ...args);
  }
}

/**
 * Hook to fix layout shift after exiting fullscreen video in Natively iOS app.
 * 
 * Uses the Page Visibility API as the primary detection method since native
 * fullscreen video causes the WebView page to become "hidden", and when
 * returning from fullscreen, the visibility changes back to "visible".
 * 
 * Also includes resize events as a secondary fallback, and standard
 * fullscreen events as a tertiary fallback.
 */
export function useFullscreenLayoutFix() {
  const natively = useNatively();
  const wasHiddenRef = useRef(false);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only run in Natively app
    let isNativeApp = false;
    try {
      const info = new NativelyInfo();
      const browserInfo = info.browserInfo();
      isNativeApp = browserInfo.isNativeApp;
    } catch (e) {
      // Not in native environment
    }

    if (!isNativeApp) return;

    nativelyLog('Fullscreen layout fix initialized');

    // APPROACH A: Detect native fullscreen via Page Visibility API.
    // When the native video player takes over, the webview page becomes
    // hidden. When it returns, visibilitychange fires.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHiddenRef.current = true;
        nativelyLog('Page became hidden (possible fullscreen entry)');
        return;
      }

      // Page just became visible again
      if (!wasHiddenRef.current) return;
      wasHiddenRef.current = false;

      nativelyLog('Page became visible after being hidden - triggering reset');

      // Show the native loading screen briefly to mask the reset
      try {
        natively.showLoadingScreen(true);
      } catch (e) {
        nativelyLog('Could not show loading screen:', e);
      }

      // Force a full viewport reset
      resetViewport();
    };

    // APPROACH B: Detect resize events that follow fullscreen exit.
    // The WebView may fire a resize when returning from native fullscreen.
    const handleResize = () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => {
        nativelyLog('Resize detected - triggering reset');
        resetViewport();
      }, 300);
    };

    // APPROACH C: Standard fullscreen events as fallback
    const handleFullscreenExit = () => {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) return;
      nativelyLog('Standard fullscreen exit detected - triggering reset');
      resetViewport();
    };

    // Attach listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleFullscreenExit);
    document.addEventListener('webkitfullscreenchange', handleFullscreenExit);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleFullscreenExit);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenExit);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, [natively]);
}

/**
 * Forces a complete viewport reset to fix layout shift issues.
 * Uses multiple techniques to ensure the WebView recalculates layout properly.
 */
function resetViewport() {
  nativelyLog('Resetting viewport...');

  // Save current scroll position
  const scrollY = window.scrollY;

  // 1. Force scroll to top
  window.scrollTo(0, 0);

  // 2. Toggle a CSS class that forces GPU layer recalculation
  document.body.classList.add('natively-viewport-reset');

  // 3. Manipulate the viewport meta tag to force a re-layout
  // This is a known WebView trick that forces the rendering engine to re-evaluate layout
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    const originalContent = viewport.getAttribute('content') || '';
    viewport.setAttribute('content', originalContent + ', maximum-scale=1');
    requestAnimationFrame(() => {
      viewport.setAttribute('content', originalContent);
    });
  }

  // 4. Force window to recalculate by toggling html height/overflow
  const html = document.documentElement;
  html.style.height = 'auto';
  html.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      html.style.height = '';
      html.style.overflow = '';
      document.body.classList.remove('natively-viewport-reset');

      // Restore scroll position
      window.scrollTo(0, scrollY);

      // 5. Dispatch event to refresh safe area insets
      window.dispatchEvent(new Event('natively:refresh-insets'));

      nativelyLog('Viewport reset complete, scroll restored to', scrollY);
    });
  });
}
