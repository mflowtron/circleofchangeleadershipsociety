import { useEffect } from 'react';

/**
 * Fetches native safe area insets from the Natively SDK and applies them
 * as CSS custom properties on :root for use throughout the app.
 * 
 * Sets: --natively-safe-area-top, --natively-safe-area-bottom, 
 *       --natively-safe-area-left, --natively-safe-area-right
 */
export function useNativelySafeArea() {
  useEffect(() => {
    try {
      // Check if running inside Natively wrapper with getInsets support
      // Using type assertion since getInsets may be available at runtime but not in types
      const nativelyInstance = (window as any).natively;
      if (typeof nativelyInstance?.getInsets === 'function') {
        nativelyInstance.getInsets((insets: { top: number; bottom: number; left: number; right: number }) => {
          if (insets) {
            const root = document.documentElement;
            root.style.setProperty('--natively-safe-area-top', `${insets.top}px`);
            root.style.setProperty('--natively-safe-area-bottom', `${insets.bottom}px`);
            root.style.setProperty('--natively-safe-area-left', `${insets.left}px`);
            root.style.setProperty('--natively-safe-area-right', `${insets.right}px`);
          }
        });
      }
    } catch (error) {
      // Silently fail - app continues to work with env() fallbacks
      console.debug('Natively safe area insets not available:', error);
    }
  }, []);
}
