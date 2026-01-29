
# Make Announcement Banner Un-dismissable

## Overview
Remove the ability for users to dismiss announcements from the banner displayed in the Feed. Announcements will remain visible until they expire or are deactivated by an admin.

## Implementation

**File:** `src/components/announcements/AnnouncementBanner.tsx`

The `AnnouncementCard` component already supports a `showDismiss` prop that controls whether the X button appears. Currently it defaults to `true`. Simply pass `showDismiss={false}` to hide the dismiss button.

### Code Change

```tsx
<AnnouncementCard
  key={announcement.id}
  announcement={announcement}
  showDismiss={false}
/>
```

The `onDismiss` prop can also be removed since it's no longer needed.

## Result
- The X button will no longer appear on announcement banners
- Announcements will remain visible to users until they expire or are deactivated by an admin
- The existing dismissal logic in the hook and database table remains intact (can be re-enabled later if needed)
