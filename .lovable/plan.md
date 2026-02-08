

# Push Notification Content Customization

## Overview

Add separate, editable Push Title and Push Message fields to the Event Announcements form that appear when the "Also Send Push Notification" toggle is enabled. These fields respect OneSignal's character limits (50 chars for title, 200 chars for message) and auto-sync from announcement text until manually customized.

## What Changes

### User Experience

| Scenario | Before | After |
|----------|--------|-------|
| Push toggle enabled | No visibility into push content | See separate Push Title/Message fields |
| Long announcement | Content silently truncated at 200 chars | Warning shown, fields pre-truncated with counters |
| Customizing push | Not possible | Edit push fields independently from announcement |
| Re-syncing | Not applicable | "Reset to announcement text" button available |

## Implementation Details

### File Modified

Only one file: `src/pages/events/manage/EventAnnouncements.tsx`

### Changes

1. **Add Constants and State**
   - `MAX_PUSH_TITLE = 50` and `MAX_PUSH_MESSAGE = 200` constants
   - `pushTitle`, `pushMessage`, `pushCustomized` state variables

2. **Add Handler Functions**
   - `handleSendPushToggle`: Auto-populates push fields when toggle turns on
   - `handleTitleChange`: Updates title and syncs to pushTitle if not customized
   - `handleContentChange`: Updates content and syncs to pushMessage if not customized
   - `handlePushTitleChange`: Updates push title and marks as customized
   - `handlePushMessageChange`: Updates push message and marks as customized
   - `resetPushToAnnouncement`: Re-syncs push fields from announcement text

3. **Update Form Inputs**
   - Title input uses `handleTitleChange` instead of direct `setTitle`
   - Content input uses `handleContentChange` instead of direct `setContent`
   - Push toggle uses `handleSendPushToggle` instead of direct `setSendPush`

4. **Add Push Content UI Section**
   - Appears conditionally when `sendPush` is true
   - Contains Push Title input with character counter (X/50)
   - Contains Push Message textarea with character counter (X/200)
   - Shows amber warning when announcement exceeds push limits
   - Shows "Reset to announcement text" button when customized

5. **Update Mutation**
   - Send `pushTitle.trim()` and `pushMessage.trim()` to edge function
   - Instead of raw `title` and truncated `content`

6. **Update Validation**
   - Require non-empty push fields when push is enabled:
   ```typescript
   const isValid = title.trim().length > 0 && content.trim().length > 0 &&
     (!sendPush || (pushTitle.trim().length > 0 && pushMessage.trim().length > 0));
   ```

7. **Update Form Reset**
   - Clear `pushTitle`, `pushMessage`, `pushCustomized` in onSuccess callback

## Technical Details

### Sync Behavior Logic

```text
┌─────────────────────────────────────────────────────────────┐
│ User edits announcement title/content                       │
│                                                             │
│   Is sendPush ON?                                           │
│   ├─ No → Only update announcement fields                   │
│   └─ Yes → Is pushCustomized?                               │
│            ├─ Yes → Only update announcement fields         │
│            └─ No → Update both announcement AND push fields │
│                    (push fields truncated to limits)        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ User edits push title/message directly                      │
│                                                             │
│   → Set pushCustomized = true                               │
│   → Stop auto-syncing from announcement                     │
│   → Show "Reset to announcement text" button                │
└─────────────────────────────────────────────────────────────┘
```

### UI Layout (Push Content Section)

```text
┌─────────────────────────────────────────────────────────────┐
│ Push Notification Content          [Reset to announcement]  │
├─────────────────────────────────────────────────────────────┤
│ Push notifications have character limits. Customize the     │
│ push title and message separately from the full announcement│
├─────────────────────────────────────────────────────────────┤
│ Push Title                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ WiFi Password Changed                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                    22/50    │
├─────────────────────────────────────────────────────────────┤
│ Push Message                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ The conference WiFi password has been updated...       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                   156/200   │
├─────────────────────────────────────────────────────────────┤
│ ⚠ Your announcement text exceeds push limits and was       │
│   auto-truncated. Edit the fields above to customize.       │
└─────────────────────────────────────────────────────────────┘
```

