'use client';

import { useEffect, useRef, useCallback } from 'react';
import { NativelyInfo } from 'natively';

interface NativelyInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function NativelySafeAreaProvider({ children }: { children: React.ReactNode }) {
  const lastRefreshRef = useRef(0);
  const isNativelyAppRef = useRef(false);

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
            
            console.debug('[NativelySafeArea] Refreshed insets:', resp);
          });
        }
      }
    } catch (error) {
      console.debug('[NativelySafeArea] Error refreshing insets:', error);
    }
  }, []);

  useEffect(() => {
    try {
      const info = new NativelyInfo();
      const browserInfo = info.browserInfo();

      if (!browserInfo.isNativeApp) return;

      isNativelyAppRef.current = true;

      // Add class to identify Natively context
      document.documentElement.classList.add('is-natively-app');

      // Initial inset fetch
      refreshInsets();

      // Event listeners for inset refresh
      const handleRefresh = () => refreshInsets();

      window.addEventListener('resize', handleRefresh);
      window.addEventListener('orientationchange', handleRefresh);
      window.addEventListener('visibilitychange', handleRefresh);
      window.addEventListener('natively:refresh-insets', handleRefresh);

      // Cleanup on unmount
      return () => {
        document.documentElement.classList.remove('is-natively-app');
        window.removeEventListener('resize', handleRefresh);
        window.removeEventListener('orientationchange', handleRefresh);
        window.removeEventListener('visibilitychange', handleRefresh);
        window.removeEventListener('natively:refresh-insets', handleRefresh);
      };
    } catch (error) {
      // Silently fail - SDK not ready or not in native environment
      console.debug('Natively safe area provider skipped:', error);
    }
  }, [refreshInsets]);

  return <>{children}</>;
}
