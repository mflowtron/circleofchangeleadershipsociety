import { NativelyInfo } from 'natively';

/**
 * Check if running inside Natively native app
 */
export function isNativeApp(): boolean {
  try {
    const info = new NativelyInfo();
    return info.browserInfo().isNativeApp;
  } catch {
    return false;
  }
}

/**
 * Warm up critical caches when app launches in native context.
 * This pre-fetches key routes so they load instantly on first navigation.
 */
export async function warmNativeCache(): Promise<void> {
  // Only warm cache in native app context
  if (!isNativeApp()) return;
  
  // Check if caches API is available
  if (!('caches' in window)) return;

  console.debug('[NativelyCache] Warming critical caches...');
  
  const criticalRoutes = [
    '/',
    '/attendee',
  ];
  
  try {
    const cache = await caches.open('pages-cache');
    
    for (const route of criticalRoutes) {
      try {
        // Only add if not already cached
        const existing = await cache.match(route);
        if (!existing) {
          await cache.add(route);
          console.debug(`[NativelyCache] Cached: ${route}`);
        }
      } catch (error) {
        // Ignore individual route failures
        console.debug(`[NativelyCache] Failed to cache: ${route}`, error);
      }
    }
    
    console.debug('[NativelyCache] Cache warming complete');
  } catch (error) {
    console.debug('[NativelyCache] Cache warming failed:', error);
  }
}

/**
 * Clear all caches - useful for troubleshooting in native context
 */
export async function clearNativeCache(): Promise<void> {
  if (!('caches' in window)) return;
  
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.debug('[NativelyCache] All caches cleared');
  } catch (error) {
    console.error('[NativelyCache] Failed to clear caches:', error);
  }
}
