import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { isRunningInNatively, setStatusBarStyle } from '@/utils/nativelyUtils';

/**
 * Hook to sync the native status bar style with the app's theme
 * Only applies when running inside Natively's WebView
 */
export function useNativelyStatusBar() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!isRunningInNatively()) return;

    // Set status bar style based on theme
    // Light theme = dark status bar text (for visibility on light backgrounds)
    // Dark theme = light status bar text (for visibility on dark backgrounds)
    const statusBarStyle = resolvedTheme === 'dark' ? 'light' : 'dark';
    setStatusBarStyle(statusBarStyle);
  }, [resolvedTheme]);
}
