import { isNativeApp } from '@/utils/nativelyCache';

/**
 * React hook to check if running inside the Natively mobile wrapper.
 * Returns true only when the app is running in the Natively iOS/Android app.
 */
export function useIsNativeApp(): boolean {
  return isNativeApp();
}
