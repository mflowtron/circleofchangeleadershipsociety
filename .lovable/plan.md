

# Add Component Preloading for Attendee App Tabs

## Overview

When a user lands on any tab in the Attendee app, all 5 main tab components will be preloaded in the background. This eliminates the brief loading delay when visiting a tab for the first time.

## Approach

Add a `useEffect` in the `AttendeeDashboard` component that triggers dynamic imports for all tab components after the initial render. This loads the JavaScript chunks in the background without blocking the current view.

---

## Implementation

### File: `src/pages/attendee/Dashboard.tsx`

Add a preloading effect that runs once when the dashboard mounts:

```text
import { useEffect } from 'react';

// Preload all attendee tab components for instant navigation
const preloadAttendeePages = () => {
  import('@/pages/attendee/EventHome');
  import('@/pages/attendee/Agenda');
  import('@/pages/attendee/Messages');
  import('@/pages/attendee/MyBookmarks');
  import('@/pages/attendee/QRCode');
};
```

Then call this function in a `useEffect` after the dashboard renders:

```text
useEffect(() => {
  // Preload sibling tabs after initial render
  preloadAttendeePages();
}, []);
```

---

## Technical Details

### Why This Works

1. **Dynamic imports return promises** - Calling `import('@/pages/...')` starts fetching the chunk immediately
2. **Vite/Webpack deduplication** - If the chunk is already loaded (from navigation), the import resolves instantly from cache
3. **Non-blocking** - Preloading happens after render, so it doesn't delay the current page
4. **One-time cost** - Once loaded, chunks stay in browser memory for the session

### Preloaded Components

| Tab | Component Path |
|-----|----------------|
| Home | `@/pages/attendee/EventHome` |
| Agenda | `@/pages/attendee/Agenda` |
| Messages | `@/pages/attendee/Messages` |
| Bookmarks | `@/pages/attendee/MyBookmarks` |
| QR Code | `@/pages/attendee/QRCode` |

Note: Networking and Profile are not in the bottom nav but could optionally be preloaded too.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/attendee/Dashboard.tsx` | Add preload function and useEffect |

---

## Expected Result

- All 5 tab chunks load in the background within ~1 second of landing on any tab
- Switching to any tab is instant (no loading flash, even on first visit)
- Network tab will show the chunk requests happening in parallel after page load

