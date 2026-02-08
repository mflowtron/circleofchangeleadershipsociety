
# Hide Feed View for Non-Natively Environments

## Summary
The Feed feature will be exclusive to users accessing the app through the Natively mobile wrapper. Users on mobile browsers or PWA installs will not see the Feed tab or be able to access the Feed route.

## How It Works

When the app loads, it checks whether it's running inside the Natively wrapper using the existing `isNativeApp()` utility. Based on this:

| Environment | Feed Tab Visible | Feed Route Accessible |
|-------------|-----------------|----------------------|
| Natively iOS/Android | Yes | Yes |
| Mobile Safari/Chrome | No | Redirects to Home |
| PWA (installed) | No | Redirects to Home |
| Desktop browser | No | Redirects to Home |

## Implementation

### 1. Create a reusable hook for Natively detection
**New file: `src/hooks/useIsNativeApp.ts`**

A simple hook that wraps the existing `isNativeApp()` utility function. This provides a React-friendly way to check the environment and can be used across multiple components.

### 2. Update Bottom Navigation
**File: `src/components/attendee/BottomNavigation.tsx`**

Filter out the Feed tab from the navigation items when not running in Natively. The navigation will show:
- **In Natively**: Home, Feed, Agenda, Messages (4 tabs)
- **Elsewhere**: Home, Agenda, Messages (3 tabs)

### 3. Protect the Feed Route
**File: `src/pages/attendee/Dashboard.tsx`**

Add a redirect check: if a user somehow navigates to `/attendee/app/feed` (e.g., via direct URL or bookmark) while not in Natively, automatically redirect them to `/attendee/app/home`.

### 4. Skip Feed preloading when not needed
**File: `src/pages/attendee/Dashboard.tsx`**

Conditionally skip preloading the Feed page component when not in Natively to save bandwidth and improve load times.

---

## Technical Details

The detection uses the existing `NativelyInfo` class from the `natively` SDK:

```typescript
import { NativelyInfo } from 'natively';

const info = new NativelyInfo();
const isNative = info.browserInfo().isNativeApp;
```

This is already wrapped safely in `src/utils/nativelyCache.ts` with try-catch error handling, so it won't break in environments where the SDK isn't available.

---

## Files to Change

1. **Create** `src/hooks/useIsNativeApp.ts` — new hook for React components
2. **Modify** `src/components/attendee/BottomNavigation.tsx` — conditionally show Feed tab
3. **Modify** `src/pages/attendee/Dashboard.tsx` — redirect non-Natively users away from Feed, skip preloading
