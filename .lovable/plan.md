

# Remove Clear Cache & Reload Functionality

## Changes

### 1. `src/pages/Profile.tsx`
- Remove the `clearAllCaches` import (line 13)
- Remove `Trash2` from the icon imports (line 12)
- Remove the entire "App Settings" Card section (lines 331-374) that contains the Clear Cache & Reload button

### 2. `src/utils/pwaUtils.ts`
- Remove the `clearAllCaches` function entirely
- Keep the remaining functions (`forceUpdateServiceWorker`, `getServiceWorkerStatus`) as they are still used by the PWA update system

### 3. `src/utils/nativelyCache.ts`
- Remove the `clearNativeCache` function (lines 55-70) since it is unused (no imports reference it)
- Keep `isNativeApp` and `warmNativeCache` which are actively used by `main.tsx` and `useIsNativeApp.ts`

### Summary
Three files modified, zero files deleted. The PWA auto-update system (`UpdateNotification`, `forceUpdateServiceWorker`) remains untouched since it is separate, active functionality.

