'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { NativelyInfo } from 'natively';

interface NativelyInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Debug logger that only logs when running in Natively app.
 */
function nativelyLog(...args: unknown[]) {
  if (typeof window !== 'undefined' && 'natively' in window) {
    console.log('[NativelySafeArea]', ...args);
  }
}

export function NativelySafeAreaProvider({ children }: { children: React.ReactNode }) {
  const lastRefreshRef = useRef(0);
  const isNativelyAppRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const settleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debugInfo, setDebugInfo] = useState<{
    offsetTop: number;
    sentinelTop: number;
    compensation: number;
    insetTop: number;
  } | null>(null);
  const showDebugRef = useRef(false);

  // Check if debug mode is enabled
  useEffect(() => {
    if (typeof window !== 'undefined') {
      showDebugRef.current = localStorage.getItem('debugViewport') === '1';
    }
  }, []);

  const refreshInsets = useCallback(() => {
    // Throttle: ignore calls within 100ms of last refresh
    const now = Date.now();
    if (now - lastRefreshRef.current < 100) {
      return;
    }
    lastRefreshRef.current = now;

    try {
      if (typeof window !== 'undefined' && 'natively' in window) {
        const natively = (window as any).natively;
        if (typeof natively?.getInsets === 'function') {
          natively.getInsets((resp: NativelyInsets) => {
            const root = document.documentElement;
            root.style.setProperty('--natively-inset-top', `${resp.top}px`);
            root.style.setProperty('--natively-inset-right', `${resp.right}px`);
            root.style.setProperty('--natively-inset-bottom', `${resp.bottom}px`);
            root.style.setProperty('--natively-inset-left', `${resp.left}px`);
            
            nativelyLog('Refreshed insets:', resp);
          });
        }
      }
    } catch (error) {
      nativelyLog('Error refreshing insets:', error);
    }
  }, []);

  /**
   * Measures viewport misalignment and applies compensation.
   * Uses both visualViewport.offsetTop and sentinel element measurement.
   */
  const measureAndCompensate = useCallback(() => {
    if (!isNativelyAppRef.current) return;

    const vv = window.visualViewport;
    const sentinel = sentinelRef.current;
    
    // Get visualViewport offset
    const vvOffsetTop = vv?.offsetTop ?? 0;
    
    // Get sentinel offset (more reliable in some cases)
    let sentinelTop = 0;
    if (sentinel) {
      const rect = sentinel.getBoundingClientRect();
      sentinelTop = rect.top;
    }
    
    // Use the larger of the two offsets (whichever is detecting the shift)
    // Clamp to a safe range (0-200px) to avoid wild jumps
    const detectedOffset = Math.max(vvOffsetTop, sentinelTop);
    const clampedOffset = Math.min(Math.max(detectedOffset, 0), 200);
    
    // Only apply compensation if there's a meaningful offset
    const compensation = clampedOffset > 1 ? -clampedOffset : 0;
    
    // Apply compensation
    document.documentElement.style.setProperty(
      '--natively-viewport-compensation-y',
      `${compensation}px`
    );
    
    if (clampedOffset > 1) {
      nativelyLog('Compensating viewport offset:', {
        vvOffsetTop,
        sentinelTop,
        compensation
      });
    }

    // Update debug info if enabled
    if (showDebugRef.current) {
      const insetTop = parseFloat(
        getComputedStyle(document.documentElement)
          .getPropertyValue('--natively-inset-top') || '0'
      );
      setDebugInfo({
        offsetTop: vvOffsetTop,
        sentinelTop,
        compensation: -compensation,
        insetTop
      });
    }

    return compensation !== 0;
  }, []);

  /**
   * Starts an active settle window that repeatedly checks and compensates
   * for viewport shifts over a period of time (for WKWebView async quirks).
   */
  const startSettleWindow = useCallback((durationMs: number = 2000) => {
    // Clear any existing settle window
    if (settleIntervalRef.current) {
      clearInterval(settleIntervalRef.current);
    }
    if (settleTimeoutRef.current) {
      clearTimeout(settleTimeoutRef.current);
    }

    nativelyLog('Starting settle window for', durationMs, 'ms');

    // Run compensation checks every 50ms
    settleIntervalRef.current = setInterval(() => {
      measureAndCompensate();
    }, 50);

    // Stop after duration
    settleTimeoutRef.current = setTimeout(() => {
      if (settleIntervalRef.current) {
        clearInterval(settleIntervalRef.current);
        settleIntervalRef.current = null;
      }
      nativelyLog('Settle window ended');
      
      // One final check
      measureAndCompensate();
    }, durationMs);
  }, [measureAndCompensate]);

  /**
   * Handle fullscreen exit event - triggers settle window.
   */
  const handleFullscreenExit = useCallback(() => {
    nativelyLog('Fullscreen exit detected, starting compensation');
    
    // Immediate compensation attempt
    measureAndCompensate();
    
    // Refresh insets
    refreshInsets();
    
    // Start settle window to catch delayed WKWebView shifts
    startSettleWindow(2000);
  }, [measureAndCompensate, refreshInsets, startSettleWindow]);

  /**
   * Handle viewport resize - check for anomalies.
   */
  const handleViewportChange = useCallback(() => {
    measureAndCompensate();
    refreshInsets();
  }, [measureAndCompensate, refreshInsets]);

  useEffect(() => {
    try {
      const info = new NativelyInfo();
      const browserInfo = info.browserInfo();

      if (!browserInfo.isNativeApp) return;

      isNativelyAppRef.current = true;
      nativelyLog('Natively app detected, initializing viewport compensation');

      // Add class to identify Natively context
      document.documentElement.classList.add('is-natively-app');

      // Create sentinel element for viewport measurement
      const sentinel = document.createElement('div');
      sentinel.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;pointer-events:none;visibility:hidden;z-index:-1;';
      document.body.appendChild(sentinel);
      sentinelRef.current = sentinel;

      // Initial inset fetch and compensation check
      refreshInsets();
      measureAndCompensate();

      // Event listeners
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          nativelyLog('Visibility restored');
          handleViewportChange();
        }
      };

      // Attach listeners
      window.addEventListener('resize', handleViewportChange);
      window.addEventListener('orientationchange', handleViewportChange);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('natively:refresh-insets', handleViewportChange);
      window.addEventListener('natively:fullscreen-exit', handleFullscreenExit);
      window.visualViewport?.addEventListener('resize', handleViewportChange);
      window.visualViewport?.addEventListener('scroll', handleViewportChange);

      // Cleanup on unmount
      return () => {
        document.documentElement.classList.remove('is-natively-app');
        
        // Remove sentinel
        if (sentinelRef.current) {
          sentinelRef.current.remove();
          sentinelRef.current = null;
        }
        
        // Clear settle window
        if (settleIntervalRef.current) {
          clearInterval(settleIntervalRef.current);
        }
        if (settleTimeoutRef.current) {
          clearTimeout(settleTimeoutRef.current);
        }

        // Remove listeners
        window.removeEventListener('resize', handleViewportChange);
        window.removeEventListener('orientationchange', handleViewportChange);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('natively:refresh-insets', handleViewportChange);
        window.removeEventListener('natively:fullscreen-exit', handleFullscreenExit);
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
        window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      };
    } catch (error) {
      // Silently fail - SDK not ready or not in native environment
      nativelyLog('Provider skipped:', error);
    }
  }, [refreshInsets, measureAndCompensate, handleViewportChange, handleFullscreenExit]);

  return (
    <>
      {children}
      {/* Debug overlay - only shown when localStorage.debugViewport === '1' */}
      {debugInfo && showDebugRef.current && (
        <div className="natively-debug-overlay">
          <div>vv.offsetTop: {debugInfo.offsetTop.toFixed(1)}px</div>
          <div>sentinel.top: {debugInfo.sentinelTop.toFixed(1)}px</div>
          <div>compensation: {debugInfo.compensation.toFixed(1)}px</div>
          <div>inset-top: {debugInfo.insetTop.toFixed(1)}px</div>
        </div>
      )}
    </>
  );
}
