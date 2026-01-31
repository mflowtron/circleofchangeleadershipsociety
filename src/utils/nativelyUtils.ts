/**
 * Natively Detection Utilities
 * 
 * Utilities for detecting if the app is running inside Natively's WebView
 * and accessing native-specific features.
 */

/**
 * Check if the app is running inside Natively's WebView
 */
export function isRunningInNatively(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for Natively's injected objects
  if ('natively' in window) return true;
  
  // Check user agent for Natively identifier
  if (window.navigator.userAgent.includes('Natively')) return true;
  
  // Check for iOS/Android standalone mode with Natively-specific properties
  const isStandalone = 
    ('standalone' in window.navigator && (window.navigator as any).standalone) ||
    window.matchMedia('(display-mode: standalone)').matches;
  
  // Additional check for Natively's bridge object
  if ('NativelyBridge' in window) return true;
  
  return false;
}

/**
 * Get the current platform the app is running on
 */
export function getNativelyPlatform(): 'ios' | 'android' | 'web' {
  if (!isRunningInNatively()) return 'web';
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }
  
  if (/android/.test(userAgent)) {
    return 'android';
  }
  
  return 'web';
}

/**
 * Check if a specific Natively feature is available
 */
export function hasNativelyFeature(feature: string): boolean {
  if (!isRunningInNatively()) return false;
  
  const natively = (window as any).natively;
  if (!natively) return false;
  
  return feature in natively;
}

/**
 * Get Natively app info if available
 */
export function getNativelyAppInfo(): {
  version?: string;
  buildNumber?: string;
  bundleId?: string;
} | null {
  if (!isRunningInNatively()) return null;
  
  const natively = (window as any).natively;
  if (!natively?.getAppInfo) return null;
  
  try {
    return natively.getAppInfo();
  } catch {
    return null;
  }
}

/**
 * Request haptic feedback (iOS only)
 */
export function triggerHapticFeedback(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
): void {
  if (!isRunningInNatively()) return;
  
  const natively = (window as any).natively;
  if (!natively?.haptic) return;
  
  try {
    natively.haptic(type);
  } catch {
    // Silently fail if haptic feedback is not available
  }
}

/**
 * Show native share sheet
 */
export async function showNativeShare(options: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> {
  // Prefer native share if available
  if (navigator.share) {
    try {
      await navigator.share(options);
      return true;
    } catch {
      return false;
    }
  }
  
  // Fallback for Natively-specific share
  const natively = (window as any).natively;
  if (natively?.share) {
    try {
      natively.share(options);
      return true;
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * Check if push notifications are available
 */
export function hasPushNotifications(): boolean {
  if (!isRunningInNatively()) return false;
  
  const natively = (window as any).natively;
  return !!natively?.pushNotifications;
}

/**
 * Request push notification permission
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!hasPushNotifications()) return false;
  
  const natively = (window as any).natively;
  try {
    const result = await natively.pushNotifications.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

/**
 * Open native settings
 */
export function openNativeSettings(): void {
  if (!isRunningInNatively()) return;
  
  const natively = (window as any).natively;
  if (natively?.openSettings) {
    natively.openSettings();
  }
}

/**
 * Set the status bar style
 */
export function setStatusBarStyle(style: 'light' | 'dark'): void {
  if (!isRunningInNatively()) return;
  
  const natively = (window as any).natively;
  if (natively?.setStatusBarStyle) {
    natively.setStatusBarStyle(style);
  }
}

/**
 * Hook to use Natively detection in React components
 */
export function useNatively() {
  return {
    isNatively: isRunningInNatively(),
    platform: getNativelyPlatform(),
    appInfo: getNativelyAppInfo(),
    triggerHaptic: triggerHapticFeedback,
    share: showNativeShare,
    hasPush: hasPushNotifications(),
    requestPush: requestPushPermission,
    openSettings: openNativeSettings,
    setStatusBar: setStatusBarStyle,
  };
}
