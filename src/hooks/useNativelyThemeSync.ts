'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { NativelyInfo } from 'natively';

/**
 * Syncs the native status bar style and app background color with the app's theme.
 * Only runs when inside the Natively wrapper (iOS/Android).
 * 
 * Status bar styles:
 * - "DARK" = dark icons/text (use on light backgrounds)
 * - "LIGHT" = light icons/text (use on dark backgrounds)
 */
export function useNativelyThemeSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const info = new NativelyInfo();
    if (!info.browserInfo().isNativeApp) return;
    if (!resolvedTheme) return; // Theme not yet resolved

    const natively = (window as any).natively;
    if (!natively) return;

    if (resolvedTheme === 'dark') {
      // Dark theme: light icons on dark background
      natively.setAppStatusBarStyleIOS('LIGHT');
      natively.setAppBackgroundColor('#161412');
    } else {
      // Light theme: dark icons on light background
      natively.setAppStatusBarStyleIOS('DARK');
      natively.setAppBackgroundColor('#F9F8F5');
    }
  }, [resolvedTheme]);
}
