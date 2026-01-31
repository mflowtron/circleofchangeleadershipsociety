'use client';

import { useEffect } from 'react';
import { NativelyInfo } from 'natively';

interface NativelyInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function NativelySafeAreaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const info = new NativelyInfo();
    const browserInfo = info.browserInfo();

    if (!browserInfo.isNativeApp) return;

    // Add class to identify Natively context
    document.documentElement.classList.add('is-natively-app');

    // Get safe area insets from Natively SDK
    if (typeof window !== 'undefined' && 'natively' in window) {
      (window as any).natively.getInsets((resp: NativelyInsets) => {
        document.documentElement.style.setProperty('--natively-inset-top', `${resp.top}px`);
        document.documentElement.style.setProperty('--natively-inset-right', `${resp.right}px`);
        document.documentElement.style.setProperty('--natively-inset-bottom', `${resp.bottom}px`);
        document.documentElement.style.setProperty('--natively-inset-left', `${resp.left}px`);
      });
    }

    // Cleanup on unmount
    return () => {
      document.documentElement.classList.remove('is-natively-app');
    };
  }, []);

  return <>{children}</>;
}
