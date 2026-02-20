

# Remove Dismiss Button from Announcement Cards

## What Changes

Announcements will always display with no way for users to close/dismiss them. Two files need updating:

### 1. `src/components/announcements/AnnouncementCard.tsx`
- Remove the `onDismiss` prop from the interface and component
- Remove the `X` icon import and `Button` import (no longer needed)
- Remove the entire dismiss button block (lines 27-37)
- Remove the `pr-6` right padding on the content div (line 39) since there's no longer a close button to avoid overlapping

### 2. `src/components/announcements/AnnouncementBanner.tsx`
- Stop passing `onDismiss={dismissAnnouncement}` to `AnnouncementCard`
- Remove the `dismissAnnouncement` destructure from `useAnnouncements()` since it's no longer used
- Switch from using the filtered `announcements` (which excludes dismissed ones) to `allAnnouncements` so every active announcement always shows, regardless of any prior dismissals

